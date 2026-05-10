"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import { APPLICATION_STATUS, EXTERNAL_JOB_TYPE } from "@ui/types/application_status";
import { JobCard } from "../JobCard";
import { Loader2 } from "lucide-react";
import { getAuthToken, isValidToken } from "../../lib/constants";
import { is5xx, FIVE_XX_USER_MESSAGE } from "../../lib/apiErrors";
import { useTokenRestore } from "../TokenRestoreProvider";
import { usePagination } from "@ui/hooks/usePagination";
import { useMyApplications } from "../../hooks/useMyApplications";
import { useExternalJobs } from "../../hooks/useExternalJobs";
import type { ExternalJob, JobLike, MyApplicationJob } from "../../lib/openapi/types";

interface JobWithStats extends JobLike {
    title?: string;
    applicationsStats?: any;
    stats?: any;
    isExternal?: boolean;
    feedName?: string;
}

interface MyJobsListProps {
    applicationStatuses: APPLICATION_STATUS[];
    externalJobType: EXTERNAL_JOB_TYPE;
    externalJobApplicationStatus: APPLICATION_STATUS;
    description: string;
    emptyStateDescription: string;
    emptyStateSubtext: string;
    showInactive?: boolean;
}

export const MyJobsList = ({
    applicationStatuses,
    externalJobType,
    externalJobApplicationStatus,
    description,
    emptyStateDescription,
    emptyStateSubtext,
    showInactive = false,
}: MyJobsListProps) => {
    const { mounted, tokenRestored } = useTokenRestore();
    const token = getAuthToken();
    const hasValidToken = mounted && tokenRestored && !!token && isValidToken(token);

    const {
        data: regularJobData,
        isLoading: regularJobsLoading,
        isFetching: regularJobsFetching,
        refetch: refetchRegularJobs,
        error: regularJobsError,
    } = useMyApplications({
        status: applicationStatuses,
        enabled: hasValidToken,
    });

    const {
        data: externalJobData,
        isLoading: externalJobsLoading,
        isFetching: externalJobsFetching,
        refetch: refetchExternalJobs,
        error: externalJobsError,
    } = useExternalJobs(externalJobType, hasValidToken);

    const isWaitingForToken = !mounted || !tokenRestored;
    const isLoading = isWaitingForToken || regularJobsLoading || externalJobsLoading;
    const isRefreshing = regularJobsFetching || externalJobsFetching;



    const LOADING_STUCK_MS = 20000;
    const [loadingStuck, setLoadingStuck] = useState(false);
    const stuckLoggedRegular = useRef(false);
    const stuckLoggedExternal = useRef(false);
    useEffect(() => {
        if (!hasValidToken) return;
        if (regularJobsLoading) {
            const t = setTimeout(() => {
                if (!stuckLoggedRegular.current) {
                    stuckLoggedRegular.current = true;
                    setLoadingStuck(true);
                }
            }, LOADING_STUCK_MS);
            return () => { clearTimeout(t); stuckLoggedRegular.current = false; };
        }
        stuckLoggedRegular.current = false;
    }, [hasValidToken, regularJobsLoading]);
    useEffect(() => {
        if (!hasValidToken) return;
        if (externalJobsLoading) {
            const t = setTimeout(() => {
                if (!stuckLoggedExternal.current) {
                    stuckLoggedExternal.current = true;
                    setLoadingStuck(true);
                }
            }, LOADING_STUCK_MS);
            return () => { clearTimeout(t); stuckLoggedExternal.current = false; };
        }
        stuckLoggedExternal.current = false;
    }, [hasValidToken, externalJobsLoading, externalJobType]);
    // Clear stuck when loading finishes (success or error)
    useEffect(() => {
        if (!regularJobsLoading && !externalJobsLoading) {
            setLoadingStuck(false);
        }
    }, [regularJobsLoading, externalJobsLoading]);

    const allJobs = useMemo(() => {
        if (!hasValidToken) {
            return [];
        }
        const jobs: JobWithStats[] = [];
        const regularJobPayload = regularJobData as { jobs?: MyApplicationJob[]; applications?: MyApplicationJob[] } | undefined;
        const regularJobs = regularJobPayload?.jobs ?? regularJobPayload?.applications ?? [];
        const externalJobs = externalJobData?.jobs ?? [];
        if (regularJobs.length) jobs.push(...regularJobs);
        externalJobs.forEach((job: ExternalJob) => {
            if (!jobs.find((j) => j.id === job.id)) {
                jobs.push({
                    id: job.id,
                    description: job.description,
                    title: job.title,
                    url: job.url,
                    createdAt: job.createdAt,
                    updatedAt: job.updatedAt,
                    term: typeof job.term === "string" ? job.term : undefined,
                    status: typeof job.status === "string" ? job.status : undefined,
                    isExternal: true,
                    feedName: (job as any).feedName || (job as any).feed_name,
                    applicationsStats: { status: externalJobApplicationStatus },
                });
            }
        });
        return [...jobs].sort((a, b) => {
            const dateA = (a as JobWithStats & { updated_at?: string; created_at?: string }).updatedAt
                || (a as JobWithStats & { updated_at?: string; created_at?: string }).createdAt
                || (a as JobWithStats & { updated_at?: string; created_at?: string }).updated_at
                || (a as JobWithStats & { updated_at?: string; created_at?: string }).created_at;
            const dateB = (b as JobWithStats & { updated_at?: string; created_at?: string }).updatedAt
                || (b as JobWithStats & { updated_at?: string; created_at?: string }).createdAt
                || (b as JobWithStats & { updated_at?: string; created_at?: string }).updated_at
                || (b as JobWithStats & { updated_at?: string; created_at?: string }).created_at;
            if (!dateA || !dateB) {
                return !dateA ? 1 : -1;
            }
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    }, [regularJobData, externalJobData, hasValidToken, externalJobApplicationStatus]);

    // Call hook at top level - before any early returns (Rules of Hooks)
    const { displayedItems, hasMoreItems, loadMoreRef } = usePagination({
        items: allJobs,
        enableInfiniteScroll: true,
    });

    // Show loading while waiting for token restoration
    if (isWaitingForToken) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-4" />
                <p className="text-gray-600">Načítám...</p>
            </div>
        );
    }

    // If no valid token after restoration, show message
    if (!hasValidToken) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-center text-gray-600 mb-4">
                    Pro zobrazení svých prací se prosím přihlaste
                </p>
            </div>
        );
    }

    // Show error message if there's an API error (including 401 from proxy)
    if (regularJobsError || externalJobsError) {
        const errorStatus =
            (regularJobsError as { status?: number })?.status ??
            (externalJobsError as { status?: number })?.status;
        if (errorStatus === 401) {
            return (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                    <p className="text-center text-gray-600 mb-4">
                        Pro zobrazení svých prací se prosím přihlaste
                    </p>
                </div>
            );
        }
        const isServerError = is5xx(errorStatus ?? 0);

        return (
            <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-center text-red-600 mb-2 font-semibold">
                    {isServerError ? "Server není dostupný" : "Chyba při načítání"}
                </p>
                <p className="text-center text-gray-600 mb-4">
                    {isServerError ? FIVE_XX_USER_MESSAGE : "Nepodařilo se načíst nabídky. Zkus to prosím znovu."}
                </p>
                <button
                    onClick={() => {
                        refetchRegularJobs();
                        refetchExternalJobs();
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                    Zkusit znovu
                </button>
            </div>
        );
    }

    // Stuck loading (backend didn't respond in time) – show retry instead of infinite spinner
    if (loadingStuck && isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-center text-amber-700 dark:text-amber-400 mb-2 font-semibold">
                    Načítání trvá příliš dlouho
                </p>
                <p className="text-center text-gray-600 mb-4">
                    Server neodpovídá. Zkus to prosím znovu.
                </p>
                <button
                    onClick={() => {
                        setLoadingStuck(false);
                        stuckLoggedRegular.current = false;
                        stuckLoggedExternal.current = false;
                        refetchRegularJobs();
                        refetchExternalJobs();
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                    Zkusit znovu
                </button>
            </div>
        );
    }

    if (isLoading || isRefreshing) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-4" />
                <p className="text-gray-600">Načítám nabídky...</p>
            </div>
        );
    }

    if (allJobs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-center text-gray-600 mb-4">{emptyStateDescription}</p>
                <p className="text-center text-gray-500 text-sm">{emptyStateSubtext}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-center text-gray-600 mb-6">{description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedItems.map((job) => (
                    <JobCard key={job.isExternal ? `ext-${job.id}` : job.id} job={job} {...(showInactive && { isInactive: true })} />
                ))}
            </div>
            {hasMoreItems && (
                <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
            )}
        </div>
    );
};
