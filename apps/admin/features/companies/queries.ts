export const companiesQueryKey = ["admin", "companies"] as const;

export function companyDetailQueryKey(companyId: string) {
  return ["admin", "companies", companyId] as const;
}
