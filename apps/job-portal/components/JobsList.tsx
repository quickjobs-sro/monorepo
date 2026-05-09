"use client";

import { useEffect, useMemo, useState } from "react";
import { JobCard } from "./JobCard";
import { usePagination } from "@ui/hooks/usePagination";
import { Loader2 } from "lucide-react";
import { JobTypeBadges, type JobTypeKey } from "./JobTypeBadges";
import type { JobLike, JobStats } from "../lib/openapi/types";

export interface JobWithStats extends JobLike {
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
    isExternal?: boolean;
    feedName?: string;
}

interface JobsListProps {
    initialJobs: JobWithStats[];
    allJobs: JobWithStats[];
    /** Optional: show subscription state on filter badges (oneTime, longTerm, fulltime). Omit to show all as active. */
    subscribedJobTypes?: string[];
    /** Optional: when filter badge is clicked, also update notification preference via API (logged-in users). May return a Promise; rejection triggers optimistic rollback. */
    onFilterNotify?: (type: JobTypeKey) => void | Promise<void>;
    /** Optional: when set, "Filtr lokace" is shown next to badges and opens location modal on click. */
    onOpenLocationFilter?: () => void;
}

interface JobsSectionProps {
    jobs: JobWithStats[];
    isInactive?: boolean;
}

const JobsSection = ({ jobs, isInactive = false }: JobsSectionProps) => {
    const { displayedItems, hasMoreItems, loadMoreRef } = usePagination<JobWithStats>({
        items: jobs,
        enableInfiniteScroll: true,
    });

    if (displayedItems.length === 0) {
        return null;
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center mb-12">
                {displayedItems.map((job) => (
                    <JobCard key={job.isExternal ? `ext-${job.id}` : job.id} job={job} {...(isInactive && { isInactive: true })} />
                ))}
            </div>

            {hasMoreItems && (
                <div ref={loadMoreRef} className="h-10 flex items-center justify-center mb-12">
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
            )}
        </>
    );
};

const JOB_TYPE_TO_TERM: Record<JobTypeKey, string> = {
    oneTime: "one_time",
    longTerm: "long_term",
    fulltime: "full_time",
};

const SUB_TO_KEY: Record<string, JobTypeKey> = {
    newOneTimeJobs: "oneTime",
    newLongTermJobs: "longTerm",
    newFullTimeJobs: "fulltime",
};

const ALL_TYPES: JobTypeKey[] = ["oneTime", "longTerm", "fulltime"]

function enabledTypesFromSubs(subscribedJobTypes?: string[]): JobTypeKey[] | null {
    if (!subscribedJobTypes?.length) return null;
    const derived = subscribedJobTypes
        .map((s) => SUB_TO_KEY[s])
        .filter((t): t is JobTypeKey => t != null);
    return derived.length > 0 ? derived : ALL_TYPES;
}

export const JobsList = ({ initialJobs, allJobs, subscribedJobTypes, onFilterNotify, onOpenLocationFilter }: JobsListProps) => {
    const [showInactiveSection, setShowInactiveSection] = useState(false);
    const [localEnabledTypes, setLocalEnabledTypes] = useState<JobTypeKey[]>(ALL_TYPES);
    /** Optimistický stav při přihlášení: hned po kliku změníme zobrazení, BE response přijde později. */
    const [optimisticEnabled, setOptimisticEnabled] = useState<JobTypeKey[] | null>(null);

    const baseEnabledTypes = useMemo(() => {
        const fromApi = enabledTypesFromSubs(subscribedJobTypes);
        return fromApi ?? localEnabledTypes;
    }, [subscribedJobTypes, localEnabledTypes]);

    const effectiveEnabledTypes = optimisticEnabled ?? baseEnabledTypes;

    useEffect(() => {
        setOptimisticEnabled(null);
    }, [subscribedJobTypes]);

    const filteredJobs = useMemo(() => {
        const enabledTerms = new Set(effectiveEnabledTypes.map((t) => JOB_TYPE_TO_TERM[t]));
        return initialJobs.filter((job) => {
            if (job.isExternal) return true;
            return job.term && enabledTerms.has(job.term as string);
        });
    }, [initialJobs, effectiveEnabledTypes]);

    const inactiveJobs = useMemo(() => {
        if (!showInactiveSection) return [];
        return allJobs.filter((job) => job.status !== "active");
    }, [allJobs, showInactiveSection]);

    const hasInactiveJobs = allJobs.some((job) => job.status !== "active");

    const OPTIMISTIC_ROLLBACK_MS = 12_000;

    const handleFilterClick = (type: JobTypeKey) => {
        if (onFilterNotify) {
            const next = effectiveEnabledTypes.includes(type)
                ? effectiveEnabledTypes.filter((t) => t !== type)
                : [...effectiveEnabledTypes, type];
            if (next.length === 0) return;
            setOptimisticEnabled(next);
            const result = onFilterNotify(type);
            const timeoutId = setTimeout(() => {
                setOptimisticEnabled(null);
            }, OPTIMISTIC_ROLLBACK_MS);
            if (result != null && typeof (result as Promise<unknown>).then === "function") {
                (result as Promise<void>)
                    .catch(() => setOptimisticEnabled(null))
                    .finally(() => clearTimeout(timeoutId));
            }
        } else {
            setLocalEnabledTypes((prev) => {
                const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
                return next.length > 0 ? next : prev;
            });
        }
    };

    return (
        <>
            <div className="mt-4 md:-mt-16 mb-14 pl-2.5 flex flex-wrap items-center gap-3 justify-start">
                <JobTypeBadges
                    variant="filter"
                    activeOneTime={effectiveEnabledTypes.includes("oneTime")}
                    activeLongTerm={effectiveEnabledTypes.includes("longTerm")}
                    activeFulltime={effectiveEnabledTypes.includes("fulltime")}
                    selectedFilter={null}
                    onFilterClick={handleFilterClick}
                />
                {onOpenLocationFilter && (
                    <button
                        type="button"
                        onClick={onOpenLocationFilter}
                        className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-2"
                    >
                        Filtr lokace
                    </button>
                )}
            </div>
            <JobsSection jobs={filteredJobs} />
            {filteredJobs.length === 0 && (
                <p className="text-gray-500 text-center py-8 pl-2.5">
                    Pro zvolené typy zatím nemáme žádné aktivní nabídky.
                </p>
            )}

            {hasInactiveJobs && (
                <div className="mt-16">
                    {!showInactiveSection ? (
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-semibold mb-4 pl-2.5">Prošvihli jste</h2>
                            <button
                                onClick={() => setShowInactiveSection(true)}
                                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
                            >
                                Zobrazit neaktivní nabídky
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-semibold mb-5 pl-2.5">Prošvihli jste</h2>
                            <JobsSection jobs={inactiveJobs} isInactive />
                        </>
                    )}
                </div>
            )}
        </>
    );
};
