import { useQuery } from "@tanstack/react-query";
import API from "quickjobs-api-wrapper";
import { API_KEYS } from "../types/api_keys";
import { EXTERNAL_JOB_TYPE } from "../types/application_status";

const REQUEST_TIMEOUT_MS = 15_000;

type ExternalJobType = EXTERNAL_JOB_TYPE;

export const useExternalJobs = (type: ExternalJobType, enabled: boolean = true) => {
  return useQuery({
    queryKey: [API_KEYS.JOBS, "external", type],
    queryFn: async () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT_MS)
      );
      const dataPromise =
        type === EXTERNAL_JOB_TYPE.APPLIED
          ? API.jobs.fetchExternalJobsApplied()
          : API.jobs.fetchExternalJobsIgnored();
      return Promise.race([dataPromise, timeoutPromise]);
    },
    refetchOnMount: true,
    enabled,
   
  });
};

