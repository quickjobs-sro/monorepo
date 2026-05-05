import { useQuery } from "@tanstack/react-query";
import API, { JOB_TERM } from "quickjobs-api-wrapper";
import { API_KEYS } from "../types/api_keys";
import { APPLICATION_STATUS } from "../types/application_status";

const REQUEST_TIMEOUT_MS = 15_000;

interface UseMyApplicationsOptions {
  status: APPLICATION_STATUS[];
  enabled?: boolean;
}

export const useMyApplications = ({ status, enabled = true }: UseMyApplicationsOptions) => {
  const statusKey = status?.length ? [...status].sort().join(",") : "";
  return useQuery({
    queryKey: [API_KEYS.JOB_APPLICATIONS, "myApplications", statusKey],
    queryFn: async () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT_MS)
      );
      const dataPromise = API.applications.getMyApplications({
        term: [JOB_TERM.FULL_TIME, JOB_TERM.LONG_TERM, JOB_TERM.ONE_TIME],
        limit: 30,
        status,
        orderBy: "createdAt",
      } as any);
      return Promise.race([dataPromise, timeoutPromise]);
    },
    enabled,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status || error?.status;
      if (status === 401) {
        return false;
      }
      if (status === 502 || status === 503 || status === 504) {
        return failureCount < 3;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

