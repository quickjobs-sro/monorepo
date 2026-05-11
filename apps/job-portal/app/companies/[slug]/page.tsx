import dynamic from "next/dynamic";
import { Header } from "../../../components/Header";
import { CompanyCard } from "../../../components/CompanyCard";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackLink } from "../../../components/BackLink";
import Script from "next/script";
import { getCompanyDetailCached, getCompaniesListCached, resolveCompanySlug, type CompanyDetailData } from "../../../lib/serverApi";
import { CompanyJobsSection } from "../../../components/CompanyJobsSection";
import { JobLoadNetworkError, normalizeApiError, is5xx } from "../../../lib/apiErrors";
import { safeJsonLd } from "../../../lib/utils";

// safeJsonLd escapes <, >, & — safe to use with dangerouslySetInnerHTML (same pattern as jobs/detail/[id]/page.tsx)

const Footer = dynamic(
    () => import("../../../components/Footer").then((m) => ({ default: m.Footer })),
    { loading: () => <div className="h-32 animate-pulse bg-gray-100" /> }
);

export const revalidate = 60;
export const maxDuration = 30;

export async function generateStaticParams() {
    try {
        const { companies } = await getCompaniesListCached();
        return companies
            .filter((c) => c.slug)
            .map((c) => ({ slug: c.slug as string }));
    } catch {
        return [];
    }
}

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const companyId = await resolveCompanySlug(slug);

    if (isNaN(companyId)) {
        return {
            title: "Firma nenalezena | QuickJOBS.cz",
            robots: { index: false, follow: false },
        };
    }

    try {
        const { company } = await getCompanyDetailCached(companyId);
        const url = `https://jobs.quickjobs.cz/companies/${slug}`;
        return {
            title: `${company.name} \u2014 Detail firmy | QuickJOBS.cz`,
            description:
                company.shortDescription ||
                `Zji\u0161t\u011bte v\u00edce o firm\u011b ${company.name} a jejich nab\u00eddkách pro studenty a absolventy.`,
            robots: { index: true, follow: true },
            alternates: { canonical: url },
            openGraph: {
                title: `${company.name} \u2014 Detail firmy | QuickJOBS.cz`,
                description:
                    company.shortDescription ||
                    `Zji\u0161t\u011bte v\u00edce o firm\u011b ${company.name}.`,
                url,
                siteName: "QuickJOBS.cz",
                locale: "cs_CZ",
                type: "website",
                images: company.logo
                    ? [{ url: company.logo, alt: `${company.name} logo` }]
                    : [
                          {
                              url: "https://jobs.quickjobs.cz/img/og-image.png",
                              width: 1200,
                              height: 630,
                              alt: "QuickJOBS.cz",
                          },
                      ],
            },
            twitter: {
                card: "summary_large_image",
                title: `${company.name} \u2014 Detail firmy | QuickJOBS.cz`,
                description: company.shortDescription || `Zji\u0161t\u011bte v\u00edce o firm\u011b ${company.name}.`,
                images: company.logo
                    ? [company.logo]
                    : ["https://jobs.quickjobs.cz/img/og-image.png"],
            },
        };
    } catch {
        return {
            title: "Detail firmy | QuickJOBS.cz",
            robots: { index: false, follow: false },
        };
    }
}

export default async function CompanyDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const companyId = await resolveCompanySlug(slug);

    if (isNaN(companyId)) {
        notFound();
    }

    let companyData: CompanyDetailData | undefined;
    let networkErrorMessage: string | null = null;

    try {
        companyData = await getCompanyDetailCached(companyId);
    } catch (error) {
        if (error instanceof JobLoadNetworkError) {
            const normalized = normalizeApiError(error);
            if (normalized.isTimeout) {
                networkErrorMessage = "Po\u017eadavek vyp\u0159el. Zkus to pros\u00edm znovu.";
            } else if (is5xx(normalized.status)) {
                networkErrorMessage = "Backend nen\u00ed dostupn\u00fd. Zkus to pros\u00edm za chv\u00edli znovu.";
            } else {
                networkErrorMessage = "Nepoda\u0159ilo se na\u010d\u00edst detail firmy. Zkus to pros\u00edm znovu.";
            }
        } else {
            notFound();
        }
    }

    if (networkErrorMessage) {
        return (
            <>
                <Header />
                <main className="min-h-screen pt-4 sm:pt-24 md:pt-32 lg:pt-36">
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                        <div className="text-center py-12">
                            <p className="text-red-500 mb-4">
                                {networkErrorMessage}
                            </p>
                            <a
                                href={`/companies/${slug}`}
                                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
                            >
                                Zkusit znovu
                            </a>
                        </div>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (!companyData) {
        notFound();
    }

    const { company, activeJobs, inactiveJobs } = companyData;

    const organizationJsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: company.name,
        url: `https://jobs.quickjobs.cz/companies/${slug}`,
        ...(company.logo && { logo: company.logo }),
        ...(company.location && {
            address: {
                "@type": "PostalAddress",
                addressLocality: company.location,
                addressCountry: "CZ",
            },
        }),
    };

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "QuickJOBS.cz",
                item: "https://jobs.quickjobs.cz",
            },
            {
                "@type": "ListItem",
                position: 2,
                name: "Firmy",
                item: "https://jobs.quickjobs.cz/companies",
            },
            {
                "@type": "ListItem",
                position: 3,
                name: company.name,
                item: `https://jobs.quickjobs.cz/companies/${slug}`,
            },
        ],
    };

    return (
        <>
            {/* safeJsonLd escapes <, >, & — content is safe */}
            <Script id="company-jsonld" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }} />
            <Script id="breadcrumb-jsonld" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
            <Header />
            <main className="min-h-screen pt-4 sm:pt-24 md:pt-32 lg:pt-36">
                <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                    <BackLink href="/companies" label="Zpět na firmy" className="mb-6" />

                    <CompanyCard company={company} variant="detail" />

                    <CompanyJobsSection
                        activeJobs={activeJobs}
                        inactiveJobs={inactiveJobs}
                        slug={slug}
                        companyName={company.name}
                    />

                </div>
            </main>
            <Footer />
        </>
    );
}
