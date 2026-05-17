import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cache, Suspense } from "react";
import Script from "next/script";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "../../../../components/Header";
import { NavigationLink } from "@ui/components/core/navigation-link";
import { Button } from "@ui/components/core/button";
import { fetchPublicJobById, fetchPublicJobs } from "../../../../lib/api";
import { fetchExternalJobById, fetchPublicExternalJobById } from "../../../../lib/migratedQueries";
import { generateAISEO, generateJobSEO } from "../../../../lib/seo";
import { safeJsonLd } from "../../../../lib/utils";
import { getApplicationStatusForJob, getJobsListCached, withAuthContext, getAuthTokenFromCookies } from "../../../../lib/serverApi";
import { JobBreadcrumb } from "./JobBreadcrumb";
import { JobLoadNetworkError } from "../../../../lib/apiErrors";
import { extractJobTitle, calculateTimeLeft } from "../../../../lib/jobHelpers";
import { JobVisitTracker } from "../../../../components/JobVisitTracker";
import type { ExternalJob, JobLike } from "../../../../lib/openapi/types";

type ExternalJobRuntime = Omit<ExternalJob, "place" | "term" | "status" | "author"> & {
    place?: { address?: string; latitude?: number; longitude?: number };
    term?: string;
    status?: string;
    author?: { url?: string; name?: string; avatarImageUrl?: string };
};

const Footer = dynamic(
    () => import("../../../../components/Footer").then((m) => ({ default: m.Footer })),
    { loading: () => <div className="h-32 animate-pulse bg-gray-100" /> }
);
const FeaturesCard = dynamic(
    () => import("../../../../components/FeaturesCard").then((m) => ({ default: m.default })),
    { loading: () => <div className="h-48 animate-pulse rounded-lg bg-gray-100" /> }
);
const ShareButtons = dynamic(
    () => import("../../../../components/ShareButtons").then((m) => ({ default: m.ShareButtons }))
);

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { id } = await params;

    // Validate ID is a valid number
    const jobId = Number(id);
    if (isNaN(jobId) || jobId <= 0 || !Number.isInteger(jobId)) {
        return {
            title: "Nabídka nenalezena | QuickJOBS.cz",
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    try {
        // Use same cached fetch as page content to avoid duplicate request
        let jobDetail = await getJobDetailCached(id);
        if (!jobDetail?.job) {
            jobDetail = await getExternalJobDetail(id);
        }
        if (!jobDetail?.job) {
            return {
                title: "Nabídka nenalezena | QuickJOBS.cz",
                robots: { index: false, follow: false },
            };
        }
        const job = jobDetail.job;

        const jobTypeLabel =
            job.term === "one_time"
                ? "JEDNORÁZOVÁ BRIGÁDA"
                : job.term === "long_term"
                    ? "DLOUHODOBÁ BRIGÁDA"
                    : "PLNÝ ÚVAZEK";

        // Use fast rule-based SEO for metadata (crawlers); keep AI SEO for page body only
        const seoContent = await generateJobSEO({
            job,
            jobTypeLabel,
            location: job.place?.address || "Praha",
            title: jobDetail.title ?? undefined,
        });

        const url = `https://jobs.quickjobs.cz/jobs/detail/${id}`;

        return {
            title: seoContent.title,
            description: seoContent.description,
            keywords: seoContent.keywords.join(", "),
            authors: [{ name: "QuickJOBS" }],
            creator: "QuickJOBS",
            publisher: "QuickJOBS",
            robots: {
                index: job.status === "active",
                follow: true,
                googleBot: {
                    index: job.status === "active",
                    follow: true,
                    "max-video-preview": -1,
                    "max-image-preview": "large",
                    "max-snippet": -1,
                },
            },
            alternates: {
                canonical: url,
            },
            openGraph: {
                title: seoContent.title,
                description: seoContent.metaDescription,
                url: url,
                siteName: "QuickJOBS.cz",
                locale: "cs_CZ",
                type: "website",
                images: [
                    {
                        url: "https://jobs.quickjobs.cz/img/og-image.png",
                        width: 1200,
                        height: 630,
                        alt: seoContent.title,
                    },
                ],
            },
            twitter: {
                card: "summary_large_image",
                title: seoContent.title,
                description: seoContent.metaDescription,
                creator: "@quickjobs",
                images: ["https://jobs.quickjobs.cz/img/og-image.png"],
            },
        };
    } catch {
        return {
            title: "Nabídka nenalezena | QuickJOBS.cz",
            robots: {
                index: false,
                follow: false,
            },
        };
    }
}

function isTimeoutOrNetworkError(e: unknown): boolean {
    const err = e as { cause?: { code?: string }; code?: string; message?: string };
    const code = err?.cause?.code ?? err?.code;
    const msg = err?.message ?? "";
    return code === "ETIMEDOUT" || code === "ECONNRESET" || msg.includes("fetch failed") || msg.includes("timeout");
}

async function getJobDetail(id: string) {
    const jobId = Number(id);
    if (isNaN(jobId) || jobId <= 0 || !Number.isInteger(jobId)) {
        if (process.env.NODE_ENV === "development") {
            console.error("Invalid job ID:", id);
        }
        return null;
    }

    try {
        const publicResult = await fetchPublicJobById(jobId);
        const job: JobLike | undefined = publicResult.data;
        const stats = publicResult.stats;
        const applicationStatus: "applied" | "ignored" | "accepted" | "rejected" | null = null;
        const title = (job as any).title || extractJobTitle(job.description);
        const expiresAt = (job as any).offer_expires_at || job.offerExpiresAt;
        const { days: timeLeftDays, hours: timeLeftHour } = calculateTimeLeft(expiresAt);
        return { job, stats, title, timeLeftDays, timeLeftHour, applicationStatus };
    } catch (error) {
        if (process.env.NODE_ENV === "development" && (error as { status?: number })?.status !== 404) {
            console.error("Error fetching job:", error);
        }
        if (isTimeoutOrNetworkError(error)) {
            throw new JobLoadNetworkError();
        }
        return null;
    }
}

const getJobDetailCached = cache(getJobDetail);

async function getExternalJobDetail(id: string) {
    const jobId = Number(id);
    if (isNaN(jobId) || jobId <= 0 || !Number.isInteger(jobId)) return null;
    try {
        const token = await getAuthTokenFromCookies();
        // Try authenticated fetch first; fall back to public if unavailable or auth fails
        const raw = token
            ? (await fetchExternalJobById(jobId, { token })) ?? await fetchPublicExternalJobById(jobId)
            : await fetchPublicExternalJobById(jobId);
        if (!raw) return null;
        const job = raw as unknown as ExternalJobRuntime;

        const jobLike: JobLike = {
            id: job.id,
            description: job.description,
            url: job.url,
            term: job.term,
            status: job.status,
            place: job.place as JobLike["place"],
            createdAt: job.createdAt,
            // External author shape differs from internal; mapped in JobDetailNavAndContent
            author: job.author as unknown as JobLike["author"],
        };

        return {
            job: jobLike,
            stats: { jobId: job.id, appliedTotal: 0, updatedAt: "", jobVisits: 0 },
            title: job.title,
            timeLeftDays: 0,
            timeLeftHour: 0,
            applicationStatus: null as null,
            isExternal: true,
            externalUrl: job.url,
            feedName: job.feedName,
        };
    } catch {
        return null;
    }
}

async function getNavigationJobs(currentJobId: number, currentTerm: string) {
    try {
        // When logged in: use jobsAvailable (via getJobsListCached) so prev/next match jobs list. When not: public jobs.
        const jobs = await getJobsListCached(currentTerm);
        const filteredJobs = (jobs || []).filter(
            (job: JobLike) => job.term === currentTerm && job.status === "active"
        );

        const currentJobIndex = filteredJobs.findIndex((job: JobLike) => job.id === currentJobId);
        const lastJobIndex = filteredJobs.length - 1;

        const prev =
            currentJobIndex > 0
                ? filteredJobs[currentJobIndex - 1]
                : filteredJobs[lastJobIndex];
        const next =
            currentJobIndex < lastJobIndex
                ? filteredJobs[currentJobIndex + 1]
                : filteredJobs[0];

        return {
            prev: prev?.id || null,
            next: next?.id || null,
            currentJobIndex,
            lastJobIndex,
        };
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error("Error fetching navigation jobs:", error);
        }
        return {
            prev: null,
            next: null,
            currentJobIndex: 0,
            lastJobIndex: 0,
        };
    }
}

export async function generateStaticParams() {
    try {
        const publicResult = await fetchPublicJobs();
        return (publicResult.jobs ?? [])
            .filter((j: any) => j.status === "active")
            .map((job: any) => ({ id: String(job.id) }));
    } catch {
        return [];
    }
}

export const revalidate = 3600;

// Allow up to 30s so job detail doesn't hit 504 on Vercel (safety net; critical path is job + SEO only)
export const maxDuration = 30;

/** Streamed block: fetches navigation (prev/next) and renders content. Critical path stays getJobDetail + generateAISEO only. */
async function JobDetailNavAndContent({
    job,
    stats,
    title,
    timeLeftDays,
    timeLeftHour,
    applicationStatus,
    employerStatement,
    applicationStatusResolvedOnServer,
    desc,
    titleRes,
    fromCompanySlug,
    fromCompanyName,
    isExternal,
    externalUrl,
    feedName,
    navigationPromise,
}: {
    job: JobLike;
    stats: any;
    title: string;
    timeLeftDays: number;
    timeLeftHour: number;
    applicationStatus: "applied" | "ignored" | "accepted" | "rejected" | null;
    employerStatement: "saved" | "rejected" | "waiting_for_response" | "invited_for_next_round" | "employed" | null;
    applicationStatusResolvedOnServer: boolean;
    desc: string;
    titleRes: string;
    fromCompanySlug?: string;
    fromCompanyName?: string;
    isExternal?: boolean;
    externalUrl?: string;
    feedName?: string;
    navigationPromise: Promise<{ prev: number | null; next: number | null; currentJobIndex: number; lastJobIndex: number }>;
}) {
    const navigation = await navigationPromise;

    const companyQuery = (() => {
        if (!fromCompanySlug) return "";
        const p = new URLSearchParams({ fromCompany: fromCompanySlug });
        if (fromCompanyName) p.set("fromCompanyName", fromCompanyName);
        return `?${p.toString()}`;
    })();

    const jobTypeLabel =
        job.term === "one_time"
            ? "JEDNORÁZOVÁ BRIGÁDA"
            : job.term === "long_term"
                ? "DLOUHODOBÁ BRIGÁDA"
                : "PLNÝ ÚVAZEK";

    return (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Left sticky column */}
            <div className="hidden lg:block w-[220px] flex-shrink-0 self-stretch">
                {navigation.prev && (
                    <div className="sticky top-[21rem] flex flex-col items-center">
                        <div className="h-[152px]" />
                        <NavigationLink href={`/jobs/detail/${navigation.prev}${companyQuery}`}>
                            <Button
                                disabled={navigation.currentJobIndex === 0}
                                className="bg-primary w-[200px] hover:bg-primary/90 text-white rounded-full px-6 py-3 h-auto disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                size="lg"
                            >
                                <ArrowLeft className="w-6 h-6 mr-2" />
                                PŘEDCHOZÍ
                            </Button>
                        </NavigationLink>
                        {/* invisible spacer — must render at same width as right sticky (300px) for equal heights */}
                        <div className="invisible pointer-events-none w-[300px] mt-6">
                            <ShareButtons jobId={job.id} description={desc} />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 w-full max-w-[450px] mx-auto">
                <FeaturesCard
                    isDetail
                    isInactive={job.status !== "active"}
                    term={job.term}
                    description={job.description}
                    salary={Number((job as any).salary ?? job.salary ?? 0) || undefined}
                    salaryTo={
                        (job as any).salary_to != null || job.salaryTo != null
                            ? Number((job as any).salary_to ?? job.salaryTo ?? 0)
                            : undefined
                    }
                    salaryType={(job as any).salary_type || job.salaryType}
                    requirements={(job as any).requirements || (job as any).skills || []}
                    id={job.id}
                    place={job.place}
                    startsAt={(job as any).starts_at || job.startsAt}
                    endsAt={(job as any).ends_at || job.endsAt}
                    author={(() => {
                        const a = (job as any).author;
                        if (!a) return undefined;
                        const avatarUrl = a.avatarImage?.url || a.avatar_image?.url || a.avatarImageUrl;
                        const givenName = a.givenName || a.given_name || a.name;
                        const familyName = a.familyName || a.family_name;
                        if (!avatarUrl && !givenName && !familyName) return undefined;
                        return { avatarImage: { url: avatarUrl }, givenName, familyName, rating: a.rating, description: a.description };
                    })()}
                    stats={{
                        appliedTotal: stats?.applied_total || stats?.applications || 0,
                    }}
                    offerExpiresAt={(job as any).offer_expires_at || job.offerExpiresAt}
                    offer_expires_at={(job as any).offer_expires_at || job.offerExpiresAt}
                    timeLeftDays={timeLeftDays}
                    timeLeftHour={timeLeftHour}
                    title={title}
                    benefits={(job as any).benefits}
                    timeFlexibility={
                        (job as any).time_flexibility ??
                        (job as any).timeFlexibility ??
                        (typeof (job as any).employment_flexibility === "string" ? (job as any).employment_flexibility : undefined)
                    }
                    time_flexibility={
                        (job as any).time_flexibility ??
                        (job as any).timeFlexibility ??
                        (typeof (job as any).employment_flexibility === "string" ? (job as any).employment_flexibility : undefined)
                    }
                    doesStartImmediately={(job as any).does_start_immediately}
                    does_start_immediately={(job as any).does_start_immediately}
                    timePeriod={
                        (job as any).time_period ??
                        (job as any).timePeriod ??
                        (typeof (job as any).employment_duration === "string" ? (job as any).employment_duration : undefined) ??
                        (typeof (job as any).duration === "string" ? (job as any).duration : (job as any).duration?.type)
                    }
                    time_period={
                        (job as any).time_period ??
                        (job as any).timePeriod ??
                        (typeof (job as any).employment_duration === "string" ? (job as any).employment_duration : undefined) ??
                        (typeof (job as any).duration === "string" ? (job as any).duration : (job as any).duration?.type)
                    }
                    status={typeof job.status === "string" ? job.status : undefined}
                    createdAt={(job as any).created_at || job.createdAt}
                    created_at={(job as any).created_at || job.createdAt}
                    applicationStatus={applicationStatus || undefined}
                    applicationStatusResolvedOnServer={applicationStatusResolvedOnServer}
                    employerStatement={employerStatement}
                    isExternal={isExternal}
                    externalUrl={externalUrl}
                    feedName={feedName}
                    url={job.url}
                    ctaText={job.ctaText}
                />

                <div className="flex flex-col gap-4 w-full mt-6 lg:hidden">
                    {navigation.prev && (
                        <NavigationLink href={`/jobs/detail/${navigation.prev}${companyQuery}`} className="w-full">
                            <Button
                                disabled={navigation.currentJobIndex === 0}
                                className="w-full bg-primary hover:bg-primary/90 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                size="lg"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                PŘEDCHOZÍ
                            </Button>
                        </NavigationLink>
                    )}
                    {navigation.next && (
                        <NavigationLink href={`/jobs/detail/${navigation.next}${companyQuery}`} className="w-full">
                            <Button
                                disabled={navigation.currentJobIndex === navigation.lastJobIndex}
                                className="w-full bg-primary hover:bg-primary/90 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                size="lg"
                            >
                                DALŠÍ
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </NavigationLink>
                    )}
                </div>

                <div className="flex flex-col gap-6 mt-8 lg:hidden">
                    <div className="hidden sm:flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <Image
                            quality={100}
                            width={120}
                            height={120}
                            src="/img/qr-app.png"
                            alt="QR kód pro stažení mobilní aplikace QuickJOBS"
                            className="object-contain flex-shrink-0"
                        />
                        <p className="text-sm text-gray-700 leading-relaxed">
                            Buď první, kdo se o nabídkách dozví. Nech si posílat nabídky přímo do mobilu.
                        </p>
                    </div>
                    <ShareButtons jobId={job.id} description={desc} />
                </div>
            </div>

            {/* Right sticky column */}
            <div className="hidden lg:block w-[300px] flex-shrink-0 self-stretch">
                <div className="sticky top-[21rem] flex flex-col items-center gap-6">
                    <div className="flex flex-row items-center gap-3 mb-2">
                        <Image
                            quality={100}
                            width={120}
                            height={120}
                            src="/img/qr-app.png"
                            alt="QR kód pro stažení mobilní aplikace QuickJOBS"
                            className="object-contain flex-shrink-0"
                        />
                        <p className="text-sm text-gray-700 leading-relaxed text-center">
                            Buď první, kdo se o nabídkách dozví. Nech si posílat nabídky přímo do mobilu.
                        </p>
                    </div>
                    {navigation.next && (
                        <div className="w-full flex justify-center">
                            <NavigationLink href={`/jobs/detail/${navigation.next}${companyQuery}`}>
                                <Button
                                    disabled={navigation.currentJobIndex === navigation.lastJobIndex}
                                    className="w-[200px] bg-primary hover:bg-primary/90 text-white rounded-full px-6 py-3 h-auto disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    size="lg"
                                >
                                    DALŠÍ
                                    <ArrowRight className="w-6 h-6 ml-2" />
                                </Button>
                            </NavigationLink>
                        </div>
                    )}
                    <ShareButtons jobId={job.id} description={desc} />
                </div>
            </div>
        </div>
    );
}


function NavAndContentSkeleton() {
    return (
        <div className="flex flex-col lg:flex-row gap-8 items-start min-h-[400px]">
            <div className="hidden lg:block w-[220px] flex-shrink-0 self-stretch">
                <div className="sticky top-[21rem] flex flex-col items-center">
                    <div className="h-[152px]" />
                    <div className="bg-gray-200 rounded-full w-[200px] h-12 animate-pulse" />
                </div>
            </div>
            <div className="flex-1 w-full max-w-[450px] mx-auto space-y-4">
                <div className="bg-gray-200 rounded-lg h-64 animate-pulse" />
                <div className="flex flex-col gap-4 lg:hidden">
                    <div className="bg-gray-200 rounded-full h-12 animate-pulse" />
                    <div className="bg-gray-200 rounded-full h-12 animate-pulse" />
                </div>
            </div>
            <div className="hidden lg:block w-[300px] flex-shrink-0 self-stretch">
                <div className="sticky top-[21rem] flex flex-col items-center gap-6">
                    <div className="bg-gray-200 rounded-full w-[200px] h-12 animate-pulse" />
                </div>
            </div>
        </div>
    );
}

export default async function JobDetailPage({ params }: PageProps) {
    const { id } = await params;

    return withAuthContext(async () => {
        // Fire immediately — only needs id, not job data
        const applicationDetailPromise = getApplicationStatusForJob(Number(id));

        let jobDetail;
        let isExternalJob = false;
        let externalJobExtra: { externalUrl: string; feedName?: string } | null = null;

        try {
            jobDetail = await getJobDetailCached(id);
        } catch (e) {
            if (e instanceof JobLoadNetworkError) {
                return (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
                        <p className="text-center text-muted-foreground mb-4">
                            Nepodařilo se načíst nabídku. Zkus obnovit stránku.
                        </p>
                        <NavigationLink href={`/jobs/detail/${id}`}>Obnovit stránku</NavigationLink>
                    </div>
                );
            }
            throw e;
        }

        const publicJobNotFound = !jobDetail;

        if (!jobDetail) {
            const externalDetail = await getExternalJobDetail(id);
            if (externalDetail) {
                jobDetail = externalDetail;
                isExternalJob = true;
                externalJobExtra = {
                    externalUrl: externalDetail.externalUrl,
                    feedName: externalDetail.feedName,
                };
            }
        }

        if (!jobDetail) {
            if (publicJobNotFound) {
                return (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
                        <p className="text-center text-gray-800 font-semibold mb-2">Nabídka již není dostupná</p>
                        <p className="text-center text-muted-foreground mb-6">Tato nabídka byla pravděpodobně odstraněna nebo vypršela.</p>
                        <NavigationLink href="/jobs">Zpět na nabídky</NavigationLink>
                    </div>
                );
            }
            notFound();
        }

        const { job, stats, title, timeLeftDays, timeLeftHour, applicationStatus: applicationStatusFromJob } = jobDetail;

        // Start navigation fetch here (inside withAuthContext) so it runs with the correct auth context,
        // not inside the Suspense boundary where AsyncLocalStorage may not propagate.
        const navigationPromise = isExternalJob
            ? Promise.resolve({ prev: null, next: null, currentJobIndex: 0, lastJobIndex: 0 })
            : getNavigationJobs(job.id, typeof job.term === "string" ? job.term : "one_time");

        const jobTypeLabel =
            job.term === "one_time"
                ? "JEDNORÁZOVÁ BRIGÁDA"
                : job.term === "long_term"
                    ? "DLOUHODOBÁ BRIGÁDA"
                    : "PLNÝ ÚVAZEK";

        // SEO needs job (now available). App status was already in-flight. Run both concurrently.
        const [applicationDetail, seoContent] = await Promise.all([
            applicationDetailPromise,
            generateAISEO({ job, jobTypeLabel, location: job.place?.address || "Praha" }),
        ]);

        const applicationStatus = applicationDetail?.status ?? applicationStatusFromJob;
        const employerStatement = applicationDetail?.employerStatement ?? null;

        const titleRes = seoContent.title;
        const desc = seoContent.description;
        const jobUrl = `https://jobs.quickjobs.cz/jobs/detail/${job.id}`;

        // Get requirements for schema
        const requirements = (job as any).requirements || (job as any).skills || [];

        // Generate JSON-LD structured data for JobPosting
        const jobPostingSchema = {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: title || job.description.substring(0, 100),
            description: job.description,
            identifier: {
                "@type": "PropertyValue",
                name: "QuickJOBS",
                value: job.id.toString(),
            },
            datePosted: (job as any).created_at || job.createdAt || new Date().toISOString(),
            validThrough: (job as any).offer_expires_at || job.offerExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            employmentType: job.term === "one_time" ? "PART_TIME" : job.term === "long_term" ? "PART_TIME" : "FULL_TIME",
            jobLocation: {
                "@type": "Place",
                address: {
                    "@type": "PostalAddress",
                    addressLocality: job.place?.address || "Praha",
                    addressCountry: "CZ",
                },
            },
            baseSalary: job.salary
                ? {
                    "@type": "MonetaryAmount",
                    currency: "CZK",
                    value: {
                        "@type": "QuantitativeValue",
                        value: job.salary,
                        minValue: job.salary,
                        maxValue: (job as any).salary_to || job.salaryTo || job.salary,
                        unitText: job.salaryType === "hour" ? "HOUR" : job.salaryType === "total" ? "JOB" : "MONTH",
                    },
                }
                : undefined,
            hiringOrganization: (job as any).author
                ? {
                    "@type": "Organization",
                    name: `${(job as any).author.given_name || ""} ${(job as any).author.family_name || ""}`.trim() || "QuickJOBS",
                    sameAs: jobUrl,
                }
                : {
                    "@type": "Organization",
                    name: "QuickJOBS",
                    sameAs: "https://quickjobs.cz",
                },
            url: jobUrl,
            ...(job.startsAt && {
                jobStartDate: new Date((job as any).starts_at || job.startsAt).toISOString(),
            }),
            ...(requirements.length > 0 && {
                skills: requirements.join(", "),
            }),
        };

        // Breadcrumb schema
        const breadcrumbSchema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                {
                    "@type": "ListItem",
                    position: 1,
                    name: "Home",
                    item: "https://jobs.quickjobs.cz",
                },
                {
                    "@type": "ListItem",
                    position: 2,
                    name: jobTypeLabel,
                    item: `https://jobs.quickjobs.cz/jobs?term=${job.term}`,
                },
                {
                    "@type": "ListItem",
                    position: 3,
                    name: title,
                    item: jobUrl,
                },
            ],
        };

        // Enhanced JobPosting schema for AI search engines
        const enhancedJobPostingSchema = {
            ...jobPostingSchema,
            // Add more context for AI understanding
            description: seoContent.semanticContent || job.description,
            // Add work hours if available
            ...(job.endsAt && job.startsAt && {
                workHours: `Od ${new Date((job as any).starts_at || job.startsAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })} do ${new Date((job as any).ends_at || job.endsAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}`,
            }),
            // Add benefits if available
            ...((job as any).benefits && {
                benefits: Array.isArray((job as any).benefits)
                    ? (job as any).benefits.join(", ")
                    : (job as any).benefits,
            }),
            // Add time flexibility if available
            ...((job as any).time_flexibility && {
                timeFlexibility: (job as any).time_flexibility,
            }),
        };

        return (
            <>
                <Suspense fallback={<div className="fixed top-0 left-0 right-0 w-full bg-white border-b border-gray-200 py-4 h-20"></div>}>
                    <Header />
                </Suspense>
                <Script
                    id="job-posting-schema"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: safeJsonLd(enhancedJobPostingSchema) }}
                />
                <Script
                    id="breadcrumb-schema"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
                />
                {seoContent.faqSchema && (
                    <Script
                        id="faq-schema"
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: safeJsonLd(seoContent.faqSchema) }}
                    />
                )}
                <main className="mx-auto px-6 md:px-16 max-w-7xl pt-4 md:pt-36 mb-12 relative" itemScope itemType="https://schema.org/WebPage">
                    <meta itemProp="name" content={titleRes} />
                    <meta itemProp="description" content={desc} />
                    <link itemProp="url" href={jobUrl} />

                    {/* Hidden semantic content for AI search engines */}
                    <div className="sr-only" aria-hidden="true">
                        <h2>Informace o nabídce práce</h2>
                        <p itemProp="description">{seoContent.semanticContent}</p>
                        <ul>
                            <li>Typ práce: {jobTypeLabel}</li>
                            <li>Lokace: {job.place?.address || "Praha"}</li>
                            {job.salary && (
                                <li>Plat: {job.salary}{(job as any).salary_to ? ` - ${(job as any).salary_to}` : ""} Kč/{job.salaryType === "hour" ? "hod." : job.salaryType === "total" ? "práci" : "měsíc"}</li>
                            )}
                            {job.startsAt && (
                                <li>Začátek: {new Date((job as any).starts_at || job.startsAt).toLocaleDateString("cs-CZ")}</li>
                            )}
                            {(job as any).requirements && (job as any).requirements.length > 0 && (
                                <li>Požadavky: {(job as any).requirements.join(", ")}</li>
                            )}
                        </ul>
                    </div>

                    <div className="mb-8 md:pt-10 lg:pr-[340px]">
                        <Suspense fallback={<div className="h-8" />}>
                            <JobBreadcrumb title={title} jobTypeLabel={jobTypeLabel} jobTerm={typeof job.term === "string" ? job.term : "one_time"} />
                        </Suspense>

                        <h1 className="text-2xl font-bold text-gray-900 mb-6 lg:pb-6">
                            {title} - {jobTypeLabel} v {job.place?.address ? `${job.place.address}` : "Praze"}
                        </h1>
                    </div>

                    <Suspense fallback={<NavAndContentSkeleton />}>
                        <JobDetailNavAndContent
                            job={job}
                            stats={stats}
                            title={title}
                            timeLeftDays={timeLeftDays}
                            timeLeftHour={timeLeftHour}
                            applicationStatus={applicationStatus}
                            employerStatement={employerStatement}
                            applicationStatusResolvedOnServer={applicationStatus !== null}
                            desc={desc}
                            titleRes={titleRes}
                            isExternal={isExternalJob}
                            externalUrl={externalJobExtra?.externalUrl}
                            feedName={externalJobExtra?.feedName}
                            navigationPromise={navigationPromise}
                        />
                    </Suspense>
                </main>
                {!isExternalJob && <JobVisitTracker />}
                <Footer />
            </>
        );
    });
}
