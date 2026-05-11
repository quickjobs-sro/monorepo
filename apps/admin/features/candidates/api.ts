import type {
  CandidateSearchHistoryResponse,
  CandidateSearchResponse,
  CandidateWatchdog,
  JobTerm,
} from "@/lib/openapi/types";
import { fetchJson } from "@/lib/api/fetchJson";

export type CandidateSearchQueryParams = {
  keyword?: string;
  skills?: string[];
  jobTerms?: JobTerm[];
  gender?: "male" | "female";
  schoolStatus?: string[];
  schoolIds?: number[];
  schoolFacultyIds?: number[];
  age?: number;
  lat?: number;
  lng?: number;
  showAll?: boolean;
  page?: number;
  limit?: number;
};

export async function fetchCandidates(params: CandidateSearchQueryParams) {
  return fetchJson<CandidateSearchResponse>("/v1/candidates", {
    auth: true,
    query: {
      keyword: params.keyword,
      skills: params.skills?.length ? params.skills : undefined,
      jobTerms: params.jobTerms?.length ? params.jobTerms : undefined,
      gender: params.gender,
      schoolStatus: params.schoolStatus?.length ? params.schoolStatus : undefined,
      schoolIds: params.schoolIds?.length ? params.schoolIds : undefined,
      schoolFacultyIds: params.schoolFacultyIds?.length ? params.schoolFacultyIds : undefined,
      age: params.age,
      lat: params.lat,
      lng: params.lng,
      showAll: params.showAll,
      page: params.page,
      limit: params.limit,
    },
  });
}

export async function fetchCandidateSearchHistory() {
  return fetchJson<CandidateSearchHistoryResponse>("/v1/candidate-search/history", {
    auth: true,
  });
}

export async function fetchCandidateWatchdogs() {
  return fetchJson<CandidateWatchdog[]>("/v1/candidate-watchdogs", {
    auth: true,
  });
}
