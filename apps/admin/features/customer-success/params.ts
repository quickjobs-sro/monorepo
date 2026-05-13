import type {
  CompanyAnalyticsQuery,
  CompanyCriterion,
  JobAnalyticsQuery,
  JobCriterion,
} from "./types";

type QueryValue = string | number | boolean | undefined | null;
type Query = Record<string, QueryValue>;

function cleanQuery<T extends Query>(query: T): Partial<T> {
  return Object.entries(query).reduce<Partial<T>>((result, [key, value]) => {
    if (value !== undefined && value !== null && value !== false) {
      result[key as keyof T] = value as T[keyof T];
    }

    return result;
  }, {});
}

function clampOptionalInteger(value: number | undefined, min: number, max = Number.POSITIVE_INFINITY) {
  if (value === undefined) {
    return undefined;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function clampLimit(value: number | undefined) {
  return clampOptionalInteger(value, 1, 100);
}

export function buildCompanyAnalyticsRequest(params: CompanyAnalyticsQuery) {
  switch (params.view) {
    case "no_recent_jobs":
      return {
        path: "/admin/analytics/companies/no-recent-jobs",
        query: cleanQuery({
          days: clampOptionalInteger(params.days, 1),
          limit: clampLimit(params.limit),
          afterId: params.afterId,
        }),
      };
    case "low_candidate_searches":
      return {
        path: "/admin/analytics/companies/low-candidate-searches",
        query: cleanQuery({
          days: clampOptionalInteger(params.days, 1),
          minSearches: clampOptionalInteger(params.minSearches, 1),
          limit: clampLimit(params.limit),
          afterId: params.afterId,
        }),
      };
    case "no_assigned_users":
      return {
        path: "/admin/analytics/companies/no-assigned-users",
        query: cleanQuery({
          limit: clampLimit(params.limit),
          afterId: params.afterId,
        }),
      };
    case "at_risk":
      return {
        path: "/admin/analytics/companies/at-risk",
        query: cleanQuery({
          noRecentJobsDays: clampOptionalInteger(params.noRecentJobsDays, 1),
          lowCandidateSearchesDays: clampOptionalInteger(
            params.lowCandidateSearchesDays,
            1
          ),
          minCandidateSearches: clampOptionalInteger(
            params.minCandidateSearches,
            1
          ),
          noAssignedUsers: params.noAssignedUsers,
          limit: clampLimit(params.limit),
          afterId: params.afterId,
        }),
      };
  }
}

export function buildJobAnalyticsRequest(params: JobAnalyticsQuery) {
  switch (params.view) {
    case "low_applications":
      return {
        path: "/admin/analytics/jobs/low-applications",
        query: cleanQuery({
          maxApplied: clampOptionalInteger(params.maxApplied, 1),
          limit: clampLimit(params.limit),
          afterId: params.afterId,
        }),
      };
    case "old_job":
      return {
        path: "/admin/analytics/jobs/old",
        query: cleanQuery({
          minAgeDays: clampOptionalInteger(params.minAgeDays, 1),
          limit: clampLimit(params.limit),
          afterId: params.afterId,
        }),
      };
    case "low_detail_visits":
      return {
        path: "/admin/analytics/jobs/low-detail-visits",
        query: cleanQuery({
          maxDetailVisits: clampOptionalInteger(params.maxDetailVisits, 1),
          limit: clampLimit(params.limit),
          afterId: params.afterId,
        }),
      };
    case "underperforming":
      return {
        path: "/admin/analytics/jobs/underperforming",
        query: cleanQuery({
          maxApplied: clampOptionalInteger(params.maxApplied, 1),
          minAgeDays: clampOptionalInteger(params.minAgeDays, 1),
          maxDetailVisits: clampOptionalInteger(params.maxDetailVisits, 1),
          limit: clampLimit(params.limit),
          afterId: params.afterId,
        }),
      };
  }
}

export function formatCompanyCriterionLabel(criterion: CompanyCriterion): string {
  const labels: Record<CompanyCriterion, string> = {
    no_recent_jobs: "Bez nových jobů",
    low_candidate_searches: "Nízké hledání kandidátů",
    no_assigned_users: "Bez přiřazeného CS",
  };

  return labels[criterion];
}

export function formatJobCriterionLabel(criterion: JobCriterion): string {
  const labels: Record<JobCriterion, string> = {
    low_applications: "Málo reakcí",
    old_job: "Starý aktivní job",
    low_detail_visits: "Nízké návštěvy detailu",
  };

  return labels[criterion];
}
