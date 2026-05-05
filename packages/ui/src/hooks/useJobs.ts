"use client";

import { useQuery } from "@tanstack/react-query";
import API, { JOB_TERM, Job } from "quickjobs-api-wrapper";
import { API_KEYS } from "../types/api_keys";

interface JobsResponse {
  jobs: Job[];
}

const terms = [JOB_TERM.ONE_TIME, JOB_TERM.LONG_TERM, JOB_TERM.FULL_TIME];
const REQUEST_TIMEOUT_MS = 15_000;

export const useJobs = (enabled: boolean = true) => {
  return useQuery<JobsResponse>({
    queryKey: [API_KEYS.JOBS],
    queryFn: async () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT_MS)
      );
      const dataPromise = API.jobs.jobsAvailable({
        includeWiderAreas: true,
        term: terms,
      });
      return Promise.race([dataPromise, timeoutPromise]);
    },
    enabled,
    refetchOnMount: false, // Use cached data if available (staleTime handles freshness)
    refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
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
      // Retry network errors (no status) up to 1 time only
      if (!status) {
        return failureCount < 1;
      }
      // Retry other errors up to 1 time
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};