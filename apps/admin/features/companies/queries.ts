export const companiesQueryKey = ["admin", "companies"] as const;
export const publicCompaniesQueryKey = ["admin", "companies", "public-list"] as const;
export const companyOfferTypesQueryKey = ["admin", "companies", "offer-types"] as const;
export const companyUsersRootQueryKey = ["admin", "companies", "users"] as const;

export function companiesListQueryKey(q?: string) {
  return ["admin", "companies", "list", q?.trim() ?? ""] as const;
}

export function companyPickerQueryKey(q?: string) {
  return ["admin", "companies", "picker", q?.trim() ?? ""] as const;
}

export function companyDetailQueryKey(companyId: string) {
  return ["admin", "companies", "detail", companyId] as const;
}

export function companyJobsQueryKey(companyId: string) {
  return ["admin", "companies", "jobs", companyId] as const;
}

export function companyUsersQueryKey(companyId: string) {
  return [...companyUsersRootQueryKey, companyId] as const;
}

export function companyCandidateSearchesQueryKey(companyId: string) {
  return ["admin", "companies", "candidate-searches", companyId] as const;
}
