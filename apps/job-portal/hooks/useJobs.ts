"use client";

import { useQuery } from "@tanstack/react-query";
import { API_KEYS } from "@ui/types/api_keys";
import { fetchAvailableJobs } from "../lib/migratedQueries";
import { JOB_TERMS } from "../lib/openapi/types";

const REQUEST_TIMEOUT_MS = 15_000;

export const useJobs = (enabled: boolean = true) => {
    return useQuery({
        queryKey: [API_KEYS.JOBS],
        queryFn: async () => {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT_MS)
            );

            return Promise.race([
                fetchAvailableJobs({
                    includeWiderAreas: true,
                    term: [...JOB_TERMS],
                }),
                timeoutPromise,
            ]);
        },
        enabled,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: (failureCount, error: any) => {
            const status = error?.response?.status || error?.status;
            if (status === 401) {
                return false;
            }
            if (status === 500 || status === 502 || status === 503 || status === 504) {
                return false;
            }
            if (!status) {
                return failureCount < 1;
            }
            return failureCount < 1;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
};

