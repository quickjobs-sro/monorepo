"use client";

import { useMemo, useEffect } from "react";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_KEYS } from "@ui/types/api_keys";
import { useToast } from "@ui/hooks/use-toast";
import { getAuthToken, isValidToken } from "../lib/constants";
import { normalizeApiError, is5xx, FIVE_XX_USER_MESSAGE } from "../lib/apiErrors";
import { updateProfileViaApi } from "../lib/api";
import { reportError } from "../lib/reportError";
import { NOTIFICATION_TRIGGER } from "../lib/legacyApi";
import { useTokenRestore } from "./TokenRestoreProvider";
import { JobsList, JobWithStats } from "./JobsList";
import { LocationFilterLoginModal } from "./modals/LocationFilterLoginModal";
import { Skeleton } from "@ui/components/core/skeleton";
import { differenceInDays, differenceInHours } from "date-fns";
import { useRouter } from "next/navigation";
import { useJobs } from "../hooks/useJobs";
import { useGetProfile } from "../hooks/useGetProfile";
import { useExternalJobsList } from "../hooks/useExternalJobs";
import { getSubscribedJobTypes } from "../lib/subscribedJobTypes";

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

interface JobsListWrapperProps {
    initialPublicJobs: JobWithStats[];
}

const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center mb-12">
        {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-[500px]">
                <Skeleton className="h-full w-full rounded-lg" />
            </div>
        ))}
    </div>
);

const ErrorFallback = ({
    error,
    fallbackJobs,
    isLoggedIn,
}: {
    error: unknown;
    fallbackJobs: JobWithStats[];
    isLoggedIn: boolean;
}) => {
    const normalized = normalizeApiError(error);
    const isServerError = !normalized.isTimeout && is5xx(normalized.status);
    const errorMessage = normalized.isTimeout
        ? "Vypršel limit čekání. Zkus to prosím znovu."
        : isServerError
            ? FIVE_XX_USER_MESSAGE
            : normalized.message || "Nepodařilo se načíst nabídky";

    React.useEffect(() => {
        reportError(error, { location: "JobsListWrapper.useJobs" });
    }, [error]);

    if (fallbackJobs.length > 0) {
        return (
            <>

                <JobsList
                    initialJobs={fallbackJobs.filter((job) => job.status === "active")}
                    allJobs={fallbackJobs}
                />
            </>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <p className="text-center text-red-600 mb-2 font-semibold text-lg">
                {normalized.isTimeout ? "Vypršel limit čekání" : isServerError ? "Backend není dostupný" : "Chyba při načítání"}
            </p>
            <p className="text-center text-gray-600 mb-4">
                {errorMessage}
            </p>
        </div>
    );
};

export const JobsListWrapper = ({ initialPublicJobs }: JobsListWrapperProps) => {
    const { mounted, tokenRestored } = useTokenRestore();
    const userToken = getAuthToken();

    // Add small delay after token restore to avoid overwhelming backend
    // Use sessionStorage to track if we've already triggered the fetch (survives Fast Refresh)
    const STORAGE_KEY = 'jobs-fetch-triggered';
    const shouldFetchJobs = React.useMemo(() => {
        return mounted && tokenRestored && !!userToken && isValidToken(userToken);
    }, [mounted, tokenRestored, userToken]);

    // Use a debounced version to add delay
    // Initialize to false to avoid hydration mismatch (check sessionStorage after mount)
    const [debouncedShouldFetch, setDebouncedShouldFetch] = React.useState(false);
    const [locationFilterModalOpen, setLocationFilterModalOpen] = React.useState(false);

    // Check sessionStorage after mount to avoid hydration mismatch
    React.useEffect(() => {
        if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === 'true') {
            setDebouncedShouldFetch(true);
        }
    }, []);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        // Clear any existing timer
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        // If already triggered, don't set up timer again
        if (shouldFetchJobs && typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === 'true') {
            setDebouncedShouldFetch(true);
            return;
        }

        if (shouldFetchJobs) {
            // Delay authenticated requests by 200ms after token restore
            // This gives the backend time to process the token restore before other requests
            timerRef.current = setTimeout(() => {
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem(STORAGE_KEY, 'true');
                }
                setDebouncedShouldFetch(true);
                timerRef.current = null;
            }, 200);
        } else {
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem(STORAGE_KEY);
            }
            setDebouncedShouldFetch(false);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [shouldFetchJobs, mounted, tokenRestored, userToken]);

    const queryClient = useQueryClient();
    const { data: jobsData, isLoading, isError, error } = useJobs(debouncedShouldFetch);
    const { data: externalJobsData } = useExternalJobsList(debouncedShouldFetch);
    const hasValidToken = mounted && tokenRestored && !!userToken && isValidToken(userToken);


    const LOADING_GIVE_UP_MS = 20000;
    const [loadingTimedOut, setLoadingTimedOut] = React.useState(false);
    const loadingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    React.useEffect(() => {
        if (!(hasValidToken && debouncedShouldFetch && isLoading)) {
            setLoadingTimedOut(false);
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
            }
            return;
        }
        loadingTimeoutRef.current = setTimeout(() => {
            setLoadingTimedOut(true);
            loadingTimeoutRef.current = null;
        }, LOADING_GIVE_UP_MS);
        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
            }
        };
    }, [hasValidToken, debouncedShouldFetch, isLoading]);
    const { data: userProfile } = useGetProfile(!!hasValidToken);

    const subscribedJobTypes = React.useMemo(
        () => getSubscribedJobTypes(userProfile?.data?.subscribedNotifications),
        [userProfile?.data?.subscribedNotifications]
    );

    const { toast } = useToast();
    const router = useRouter();
    const filterNotifyInFlight = React.useRef(false);
    const [optimisticSubs, setOptimisticSubs] = React.useState<string[] | null>(null);
    React.useEffect(() => {
        setOptimisticSubs(null);
    }, [userProfile?.data?.subscribedNotifications]);

    const effectiveSubsForNotify =
        optimisticSubs ??
        subscribedJobTypes ??
        ["newOneTimeJobs", "newLongTermJobs", "newFullTimeJobs"];

    const handleFilterNotify = React.useCallback(
        async (type: "oneTime" | "longTerm" | "fulltime") => {
            if (filterNotifyInFlight.current) return;
            const trigger =
                type === "oneTime"
                    ? NOTIFICATION_TRIGGER.NEW_ONE_TIME_JOBS
                    : type === "longTerm"
                        ? NOTIFICATION_TRIGGER.NEW_LONG_TERM_JOBS
                        : NOTIFICATION_TRIGGER.NEW_FULL_TIME_JOBS;
            const key =
                type === "oneTime" ? "newOneTimeJobs" : type === "longTerm" ? "newLongTermJobs" : "newFullTimeJobs";
            const effectiveSubs = effectiveSubsForNotify;
            const current = effectiveSubs.includes(key);
            const next = !current;
            const activeCount = effectiveSubs.length;

            if (!next && activeCount <= 1) {
                toast({
                    title: "Nastavení",
                    description: "Min. 1 typ nabídky musí být zapnutý.",
                    variant: "destructive",
                });
                return;
            }
            const nextSubs = next
                ? [...effectiveSubs.filter((k) => k !== key), key]
                : effectiveSubs.filter((k) => k !== key);
            const action = next ? "+phone" : "-phone";
            setOptimisticSubs(nextSubs);
            filterNotifyInFlight.current = true;
            try {
                await updateProfileViaApi({
                    subscribedNotifications: { [trigger]: [action] },
                });
                queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
                queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS] });
            } catch (e) {
                console.error("Failed to update notification preference:", e);
                setOptimisticSubs(null);
                toast({
                    title: "Chyba",
                    description: "Nepodařilo se uložit nastavení. Zkus to prosím znovu.",
                    variant: "destructive",
                });
                throw e;
            } finally {
                filterNotifyInFlight.current = false;
            }
        },
        [queryClient, subscribedJobTypes, toast, effectiveSubsForNotify]
    );

    const { activeJobs, allProcessedJobs } = useMemo(() => {
        let processedJobs: JobWithStats[];

        // If user is logged in and we're fetching authenticated jobs, use those
        // Otherwise use public jobs (for non-logged-in users)
        if (debouncedShouldFetch && jobsData?.jobs && jobsData.jobs.length > 0 && !isError) {
            // Process authenticated jobs - calculate time left
            const now = new Date();
            const statsById = new Map(
                ((jobsData as any).stats ?? []).map((s: any) => [s.jobId ?? s.job_id, s])
            );
            processedJobs = jobsData.jobs.map((job: any) => {
                const expiresAt = new Date(job.offer_expires_at || job.offerExpiresAt);
                const s = statsById.get(job.id) as any;
                return {
                    ...job,
                    title: job.title,
                    timeLeftDays: Math.max(0, differenceInDays(expiresAt, now)),
                    timeLeftHour: Math.max(0, differenceInHours(expiresAt, now) % 24),
                    created_at: job.created_at || job.createdAt,
                    offer_expires_at: job.offer_expires_at || job.offerExpiresAt,
                    starts_at: job.starts_at || job.startsAt,
                    ends_at: job.ends_at || job.endsAt,
                    salary: job.salary,
                    salary_to: job.salary_to || job.salaryTo,
                    salary_type: job.salary_type || job.salaryType,
                    stats: { jobId: job.id, appliedTotal: (s?.appliedTotal ?? s?.applied_total ?? 0), updatedAt: s?.updatedAt ?? s?.updated_at ?? "", jobVisits: s?.jobVisits ?? 0 },
                } as JobWithStats;
            });
            processedJobs = processedJobs.sort((a, b) => {
                const dateA = new Date(a.created_at ?? (a as { createdAt?: string }).createdAt ?? 0);
                const dateB = new Date(b.created_at ?? (b as { createdAt?: string }).createdAt ?? 0);
                return dateB.getTime() - dateA.getTime();
            });
        } else {
            // Use public jobs when no authenticated data yet (incl. while loading – show something immediately)
            processedJobs = initialPublicJobs;
        }

        // Merge external jobs for logged-in users — appended after internal jobs
        if (debouncedShouldFetch && externalJobsData?.jobs?.length) {
            const internalIds = new Set(processedJobs.map((j) => j.id));
            const externalMapped: JobWithStats[] = (externalJobsData.jobs as any[]).map((job) => ({
                id: job.id,
                description: stripHtml(job.description || ""),
                title: job.title,
                term: typeof job.term === "string" ? job.term : undefined,
                status: typeof job.status === "string" ? job.status : "active",
                place: job.place,
                url: job.url,
                created_at: job.createdAt || job.created_at,
                isExternal: true,
                feedName: job.feedName || job.feed_name,
                stats: undefined,
            }));
            const deduped = externalMapped.filter((j) => !internalIds.has(j.id));
            processedJobs = [...processedJobs, ...deduped];
        }

        const active = processedJobs.filter((job) => job.status === "active");
        return { activeJobs: active, allProcessedJobs: processedJobs };
    }, [debouncedShouldFetch, jobsData, externalJobsData, initialPublicJobs, isError, mounted, tokenRestored, userToken, isLoading]);

    const isLoggedIn = mounted && tokenRestored && !!userToken && isValidToken(userToken);

    // When user has token: show loading until authenticated jobs are loaded, or give up after 20s so user isn't stuck.
    if (isLoggedIn && debouncedShouldFetch && isLoading && !loadingTimedOut) {
        return <LoadingSkeleton />;
    }
    // When no data at all (e.g. not mounted yet).
    if (isLoggedIn && !debouncedShouldFetch && !jobsData && initialPublicJobs.length === 0) {
        return <LoadingSkeleton />;
    }

    if (debouncedShouldFetch && isError && error) {
        return <ErrorFallback error={error} fallbackJobs={allProcessedJobs} isLoggedIn={isLoggedIn} />;
    }

    const loginUrlWithReturn = "/login?returnUrl=" + encodeURIComponent("/jobs");

    return (
        <>
            <JobsList
                initialJobs={activeJobs}
                allJobs={allProcessedJobs}
                subscribedJobTypes={effectiveSubsForNotify}
                onFilterNotify={hasValidToken ? handleFilterNotify : undefined}
                onOpenLocationFilter={
                    hasValidToken
                        ? () => router.push("/profile/edit#lokace")
                        : () => setLocationFilterModalOpen(true)
                }
            />
            <LocationFilterLoginModal
                open={locationFilterModalOpen}
                onOpenChange={setLocationFilterModalOpen}
            />
        </>
    );
};
