import type { CanonicalExternalJobDetailResponse, CanonicalExternalJobsResponse, JobTerm } from "@/lib/openapi/types";
import { fetchJson } from "@/lib/api/fetchJson";

export type ExternalJobsQueryParams = {
  term?: JobTerm[];
  limit?: number;
};

export async function fetchExternalJobs(params: ExternalJobsQueryParams = {}) {
  return fetchJson<CanonicalExternalJobsResponse>("/v1/external-jobs", {
    auth: true,
    query: {
      term: params.term?.length ? params.term : undefined,
      limit: params.limit,
    },
  });
}

export async function fetchExternalJobDetail(id: string | number) {
  return fetchJson<CanonicalExternalJobDetailResponse>(`/v1/external-jobs/${id}`, {
    auth: true,
  });
}
