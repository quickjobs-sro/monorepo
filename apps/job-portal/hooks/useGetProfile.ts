"use client";

import { useQuery } from "@tanstack/react-query";
import { API_KEYS } from "@ui/types/api_keys";
import { fetchProfile, type ProfileResponse } from "../lib/migratedQueries";

const PROFILE_TIMEOUT_MS = 12_000;

export const useGetProfile = (enabled: boolean = true) => {
    return useQuery<ProfileResponse>({
        queryKey: [API_KEYS.PROFILE],
        queryFn: async () => {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Profile request timeout")), PROFILE_TIMEOUT_MS)
            );

            return Promise.race([fetchProfile(), timeoutPromise]);
        },
        enabled,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
        retry: (failureCount, error: any) => {
            const status = error?.response?.status || error?.status;
            if (status === 401) {
                return false;
            }
            if (status === 500 || status === 502 || status === 503 || status === 504) {
                return false;
            }
            if (!status) {
                return failureCount < 2;
            }
            return failureCount < 1;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
};

