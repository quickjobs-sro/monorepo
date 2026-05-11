import type { CanonicalJobDetailResponse, CanonicalJobsResponse, JobDispatchesResponse, JobTerm } from "@/lib/openapi/types";
import { fetchJson } from "@/lib/api/fetchJson";

export type JobsQueryParams = {
  term?: JobTerm[];
  includeWiderAreas?: boolean;
};

export async function fetchCanonicalJobs(params: JobsQueryParams = {}) {
  return fetchJson<CanonicalJobsResponse>("/v1/jobs", {
    auth: true,
    query: {
      term: params.term?.length ? params.term : undefined,
      includeWiderAreas: params.includeWiderAreas,
    },
  });
}

export async function fetchCanonicalJobDetail(id: string | number) {
  return fetchJson<CanonicalJobDetailResponse>(`/v1/jobs/${id}`, {
    auth: true,
  });
}

export async function fetchJobDispatches(jobId: string | number) {
  return fetchJson<JobDispatchesResponse>(`/v1/push-notifications/jobs/${jobId}/dispatches`, {
    auth: true,
  });
}
