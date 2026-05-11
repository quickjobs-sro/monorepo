import type { CandidateSearchQueryParams } from "./api";

export function candidatesQueryKey(params: CandidateSearchQueryParams | null) {
  return ["admin", "candidates", params] as const;
}

export const candidateSearchHistoryQueryKey = ["admin", "candidates", "search-history"] as const;
export const candidateWatchdogsQueryKey = ["admin", "candidates", "watchdogs"] as const;
