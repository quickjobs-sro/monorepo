"use client";

import { useQuery } from "@tanstack/react-query";
import { API_KEYS } from "@ui/types/api_keys";
import { APPLICATION_STATUS } from "@ui/types/application_status";
import {
    fetchMyApplications,
    type MyApplicationsResponse,
} from "../lib/migratedQueries";
import { JOB_TERMS } from "../lib/openapi/types";

const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_TERMS = [...JOB_TERMS];

interface UseMyApplicationsOptions {
    status: APPLICATION_STATUS[];
    enabled?: boolean;
}

export const useMyApplications = ({ status, enabled = true }: UseMyApplicationsOptions) => {
    const statusKey = status?.length ? [...status].sort().join(",") : "";

    return useQuery<MyApplicationsResponse>({
        queryKey: [API_KEYS.JOB_APPLICATIONS, "myApplications", statusKey],
        queryFn: async () => {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT_MS)
            );

            return Promise.race([
                fetchMyApplications({
                    term: DEFAULT_TERMS,
                    limit: 30,
                    status,
                }),
                timeoutPromise,
            ]);
        },
        enabled,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
            const requestStatus = error?.response?.status || error?.status;
            if (requestStatus === 401) {
                return false;
            }
            if (requestStatus === 502 || requestStatus === 503 || requestStatus === 504) {
                return failureCount < 3;
            }
            return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};
