"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { usePagination } from "@ui/hooks/usePagination";
import { JobCard } from "./JobCard";
import type { CompanyDetailResponse } from "../lib/openapi/types";

type Job = CompanyDetailResponse["jobs"][number];

interface CompanyJobsSectionProps {
    activeJobs: Job[];
    inactiveJobs: Job[];
    slug: string;
    companyName: string;
}

function JobsGrid({ jobs, isInactive, slug, companyName }: { jobs: Job[]; isInactive?: boolean; slug: string; companyName: string }) {
    const { displayedItems, hasMoreItems, loadMoreRef } = usePagination<Job>({
        items: jobs,
        enableInfiniteScroll: true,
    });

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start mb-12">
                {displayedItems.map((job) => (
                    <JobCard
                        key={job.id}
                        job={job}
                        isInactive={isInactive}
                        fromCompanySlug={slug}
                        fromCompanyName={companyName}
                    />
                ))}
            </div>
            {hasMoreItems && (
                <div ref={loadMoreRef} className="h-10 flex items-center justify-center mb-12">
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
            )}
        </>
    );
}

export function CompanyJobsSection({ activeJobs, inactiveJobs, slug, companyName }: CompanyJobsSectionProps) {
    const [showInactive, setShowInactive] = useState(false);

    return (
        <>
            <section className="mt-10">
                <h2 className="text-2xl font-semibold mb-4 pl-2.5">
                    Aktivní 1-click nabídky
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mb-6 pl-2.5">
                    U těchto nabídek ti stačí jedno kliknutí na „Mám zájem" k přihlášení se na nabídku.
                </p>
                {activeJobs.length === 0 && inactiveJobs.length === 0 ? (
                    <p className="text-gray-500 text-sm py-6 text-center">
                        Tato firma zatím nemá žádné nabídky.
                    </p>
                ) : activeJobs.length === 0 ? (
                    <p className="text-gray-500 text-sm py-6 text-center">
                        Tato firma momentálně nemá žádné aktivní nabídky.
                    </p>
                ) : (
                    <JobsGrid jobs={activeJobs} slug={slug} companyName={companyName} />
                )}
            </section>

            {inactiveJobs.length > 0 && (
                <div className="mt-16">
                    {!showInactive ? (
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-semibold mb-4 pl-2.5">Prošvihli jste</h2>
                            <button
                                onClick={() => setShowInactive(true)}
                                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
                            >
                                Zobrazit neaktivní nabídky
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-semibold mb-5 pl-2.5">Prošvihli jste</h2>
                            <JobsGrid jobs={inactiveJobs} isInactive slug={slug} companyName={companyName} />
                        </>
                    )}
                </div>
            )}
        </>
    );
}
