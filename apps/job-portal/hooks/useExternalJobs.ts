"use client";

import { useQuery } from "@tanstack/react-query";
import { API_KEYS } from "@ui/types/api_keys";
import { EXTERNAL_JOB_TYPE } from "@ui/types/application_status";
import {
    fetchExternalAppliedJobs,
    fetchExternalIgnoredJobs,
    type ExternalJobsResponse,
} from "../lib/migratedQueries";

const REQUEST_TIMEOUT_MS = 15_000;

export const useExternalJobs = (type: EXTERNAL_JOB_TYPE, enabled: boolean = true) => {
    return useQuery<ExternalJobsResponse>({
        queryKey: [API_KEYS.JOBS, "external", type],
        queryFn: async () => {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT_MS)
            );

            const dataPromise = type === EXTERNAL_JOB_TYPE.APPLIED
                ? fetchExternalAppliedJobs()
                : fetchExternalIgnoredJobs();

            return Promise.race([dataPromise, timeoutPromise]);
        },
        refetchOnMount: true,
        enabled,
    });
};

