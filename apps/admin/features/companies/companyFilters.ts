import type { AdminCompaniesQueryParams } from "./api";

export type MissingCompanyFilterKey =
  | "missingWeb"
  | "missingLogo"
  | "missingContact";

export type MissingCompanyFilters = Record<MissingCompanyFilterKey, boolean>;

export type CompaniesListFilterState = {
  q: string;
} & MissingCompanyFilters;

export const EMPTY_MISSING_COMPANY_FILTERS: MissingCompanyFilters = {
  missingWeb: false,
  missingLogo: false,
  missingContact: false,
};

export const MISSING_COMPANY_FILTER_OPTIONS: Array<{
  key: MissingCompanyFilterKey;
  label: string;
  query: string;
}> = [
  { key: "missingWeb", label: "Chybí web", query: "missingWeb=true" },
  { key: "missingLogo", label: "Chybí logo", query: "missingLogo=true" },
  {
    key: "missingContact",
    label: "Chybí kontakt",
    query: "missingContact=true",
  },
];

export function hasMissingCompanyFilters(filters: MissingCompanyFilters) {
  return Object.values(filters).some(Boolean);
}

export function getActiveMissingCompanyFilterLabels(
  filters: MissingCompanyFilters,
): string[] {
  return MISSING_COMPANY_FILTER_OPTIONS.filter(
    (option) => filters[option.key],
  ).map((option) => option.label);
}

export function buildCompaniesListFilterState(
  q: string,
  missingFilters: MissingCompanyFilters,
): CompaniesListFilterState {
  return {
    q: q.trim(),
    missingWeb: missingFilters.missingWeb,
    missingLogo: missingFilters.missingLogo,
    missingContact: missingFilters.missingContact,
  };
}

export function buildCompaniesQueryParams({
  limit,
  afterId,
  filters,
}: {
  limit: number;
  afterId?: number;
  filters: CompaniesListFilterState;
}): AdminCompaniesQueryParams {
  return {
    limit,
    afterId,
    q: filters.q || undefined,
    missingWeb: filters.missingWeb || undefined,
    missingLogo: filters.missingLogo || undefined,
    missingContact: filters.missingContact || undefined,
  };
}
