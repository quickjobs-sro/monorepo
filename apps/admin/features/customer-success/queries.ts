import type {
  CompanyAnalyticsQuery,
  JobAnalyticsQuery,
} from "./types";

export const customerSuccessQueryKey = ["admin", "customer-success"] as const;

export function customerSuccessCompaniesQueryKey(params: CompanyAnalyticsQuery) {
  return [
    ...customerSuccessQueryKey,
    "companies",
    params.view,
    params.days ?? null,
    params.minSearches ?? null,
    params.noRecentJobsDays ?? null,
    params.lowCandidateSearchesDays ?? null,
    params.minCandidateSearches ?? null,
    params.noAssignedUsers ?? null,
    params.limit ?? null,
    params.afterId ?? null,
  ] as const;
}

export function customerSuccessJobsQueryKey(params: JobAnalyticsQuery) {
  return [
    ...customerSuccessQueryKey,
    "jobs",
    params.view,
    params.maxApplied ?? null,
    params.minAgeDays ?? null,
    params.maxDetailVisits ?? null,
    params.limit ?? null,
    params.afterId ?? null,
  ] as const;
}
