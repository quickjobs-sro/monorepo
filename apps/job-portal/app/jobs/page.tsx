import dynamic from "next/dynamic";
import { JobsListWrapper } from "../../components/JobsListWrapper";
import { Header } from "../../components/Header";
import { fetchPublicJobs } from "../../lib/api";
import { fetchPublicExternalJobsList } from "../../lib/migratedQueries";
import Image from "next/image";
import type { Metadata } from "next";
import type { JobLike, JobStats } from "../../lib/openapi/types";

const MobileAppButtons = dynamic(
    () => import("../../components/MobileAppButtons").then((m) => ({ default: m.MobileAppButtons }))
);
const Footer = dynamic(() => import("../../components/Footer").then((m) => ({ default: m.Footer })), {
    loading: () => <div className="h-32 animate-pulse bg-gray-100" />,
});

export const metadata: Metadata = {
    title: "Brigády, dlouhodobé brigády a zaměstnání v Praze | QuickJOBS.cz",
    description:
        "Prohlídněte si nabídky brigád, dlouhodobých brigád a zaměstnání v Praze od našich inzerentů. Najděte si práci přesně tam, kde chcete podle zadaného okruhu.",
    keywords: [
        "práce Praha",
        "brigáda Praha",
        "dlouhodobá brigáda Praha",
        "jednorázová brigáda Praha",
        "plný úvazek Praha",
        "zaměstnání Praha",
        "QuickJOBS",
        "hledám práci",
        "nabídky práce",
    ].join(", "),
    authors: [{ name: "QuickJOBS" }],
    creator: "QuickJOBS",
    publisher: "QuickJOBS",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    alternates: {
        canonical: "https://jobs.quickjobs.cz/jobs",
    },
    openGraph: {
        title: "Brigády, dlouhodobé brigády a zaměstnání v Praze | QuickJOBS.cz",
        description:
            "Prohlídněte s nabídky brigád, dlouhodobých brigád a zaměstnání v Praze od našich inzerentů. Najděte si práci přesně tam, kde chcete podle zadaného okruhu.",
        url: "https://jobs.quickjobs.cz/jobs",
        siteName: "QuickJOBS.cz",
        locale: "cs_CZ",
        type: "website",
        images: [
            {
                url: "https://jobs.quickjobs.cz/img/og-image.png",
                width: 1200,
                height: 630,
                alt: "QuickJOBS - Brigády a zaměstnání v Praze",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Brigády, dlouhodobé brigády a zaměstnání v Praze | QuickJOBS.cz",
        description:
            "Prohlídněte s nabídky brigád, dlouhodobých brigád a zaměstnání v Praze od našich inzerentů.",
        creator: "@quickjobs",
        images: ["https://jobs.quickjobs.cz/img/og-image.png"],
    },
};

interface JobWithStats extends JobLike {
    title?: string;
    timeLeftDays?: number;
    timeLeftHour?: number;
    stats?: JobStats;
    created_at?: string;
    offer_expires_at?: string;
    starts_at?: string;
    ends_at?: string;
    salary_to?: number | null;
    salary_type?: string;
}

async function getJobs(): Promise<JobWithStats[]> {
    try {
        const { jobs, stats } = await fetchPublicJobs();

        const sortedJobs = (jobs ?? []).sort((a, b) => {
            const dateA = new Date(
                (a as any).created_at || a.createdAt
            );
            const dateB = new Date(
                (b as any).created_at || b.createdAt
            );
            return dateB.getTime() - dateA.getTime();
        });

        // Import helpers for title extraction and time calculation
        const { extractJobTitle, calculateTimeLeft } = await import("../../lib/jobHelpers");

        const processedJobs = sortedJobs.map((job) => {
            const jobStats = stats?.find((s) => s.jobId === job.id);

            // Extract title and calculate time left using helpers
            const title = extractJobTitle(job.description);
            const expiresAt = (job as any).offer_expires_at || job.offerExpiresAt;
            const { days: timeLeftDays, hours: timeLeftHour } = calculateTimeLeft(expiresAt);

            return {
                ...job,
                stats: jobStats,
                title,
                timeLeftDays,
                timeLeftHour,
                created_at: (job as any).created_at || job.createdAt,
                offer_expires_at: (job as any).offer_expires_at || job.offerExpiresAt,
                starts_at: (job as any).starts_at || job.startsAt,
                ends_at: (job as any).ends_at || job.endsAt,
                salary: (job as any).salary || job.salary,
                salary_to: (job as any).salary_to || job.salaryTo,
                salary_type: (job as any).salary_type || job.salaryType,
            };
        });

        return processedJobs;
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            const e = error as { message?: string; cause?: { code?: string }; code?: string };
            const code = e?.cause?.code ?? e?.code;
            const isNetworkOrTimeout =
                code === "ETIMEDOUT" || code === "UND_ERR_SOCKET" || code === "ECONNRESET" ||
                (typeof e?.message === "string" && e.message.includes("fetch failed"));
            if (isNetworkOrTimeout) {
                console.warn("[getJobs] Public jobs API unavailable (timeout/connection), showing empty list");
            } else {
                console.error("Error fetching jobs:", error);
            }
        }
        return [];
    }
}


async function getPublicExternalJobs() {
    try {
        const result = await fetchPublicExternalJobsList({ lat: 50.0755, lng: 14.4378 });
        return result.jobs ?? [];
    } catch {
        return [];
    }
}

export const revalidate = 60; // 1 min

export default async function Page(): Promise<JSX.Element> {
    const [jobs, externalJobs] = await Promise.all([getJobs(), getPublicExternalJobs()]);

    return (
        <>
            <Header />
            <main className="mx-auto px-6 md:px-16 max-w-full pt-4 md:pt-36">
                <div className="pt-4 md:pt-16">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:gap-8 w-full pl-2.5 pr-2.5 sm:pr-0 mb-6">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold mb-4">Nabídky pro studenty a absolventy</h1>
                            <div className="mb-4">
                                <p className="text-base font-bold text-gray-900">
                                    TIP: Stáhni si naši appku a měj joby pod palcem 🔥
                                </p>
                                <p className="text-sm text-gray-700 mt-1">
                                    Nemusíš nic hledat – nabídky chodí samy přímo tobě. Přihlášení máš pak pouze na jeden klik.
                                </p>
                            </div>
                            <div className="sm:hidden mb-8">
                                <MobileAppButtons isShort alignLeft hideHeadingText />
                            </div>
                        </div>
                        <div className="hidden sm:block flex-shrink-0 mt-2">
                            <Image
                                quality={100}
                                width={200}
                                height={200}
                                src="/img/qr-app.png"
                                alt="QR kód pro stažení mobilní aplikace QuickJOBS"
                                className="object-contain"
                            />
                        </div>
                    </div>
                </div>

                <JobsListWrapper initialPublicJobs={jobs} initialPublicExternalJobs={externalJobs} />
            </main>
            <Footer />
        </>
    );
}
