import type { JobTerm, PublicJobDetailResponse, PublicJobsResponse } from "@/lib/openapi/types";
import { fetchJson } from "@/lib/api/fetchJson";

export type JobsQueryParams = {
  term?: JobTerm[];
  lat?: number;
  lng?: number;
};

export async function fetchPublicJobs(params: JobsQueryParams = {}) {
  return fetchJson<PublicJobsResponse>("/jobs/public", {
    query: {
      lat: params.lat,
      lng: params.lng,
      term: params.term?.length ? params.term : undefined,
    },
  });
}

export async function fetchPublicJobDetail(id: string | number) {
  return fetchJson<PublicJobDetailResponse>(`/jobs/public/${id}`);
}
