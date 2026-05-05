import { useQuery } from "@tanstack/react-query";
import API from "quickjobs-api-wrapper";
import { API_KEYS } from "../types/api_keys";

export const useGetProfile = (enabled: boolean = true) => {
  return useQuery({
    queryKey: [API_KEYS.PROFILE],
    queryFn: async () => {
      const PROFILE_TIMEOUT_MS = 12000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Profile request timeout")), PROFILE_TIMEOUT_MS)
      );
      return Promise.race([API.users.getProfile(), timeoutPromise]);
    },
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 min – align with useJobs / useMyJobs
    retry: (failureCount, error: any) => {
      const status = error?.response?.status || error?.status;
      // Don't retry on 401 (unauthorized) - token issues
      if (status === 401) {
        return false;
      }
      // DON'T retry on 500/502/503/504 - backend/DB is down, retrying will make it worse
      // These errors indicate the server/database is unavailable or overloaded
      if (status === 500 || status === 502 || status === 503 || status === 504) {
        return false;
      }
      // Retry network errors (e.g. "Network request failed") up to 2 times when backend is flaky
      if (!status) {
        return failureCount < 2;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
