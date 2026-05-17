import type {
  CompanyAnalyticsQuery,
  CompanyAnalyticsView,
  JobAnalyticsQuery,
  JobAnalyticsView,
} from "./types";

export const DEFAULT_COMPANY_LIMIT = 30;
export const DEFAULT_JOB_LIMIT = 30;

export type CompanyFilterDraft = {
  view: CompanyAnalyticsView;
  days: string;
  minSearches: string;
  noRecentJobsDays: string;
  lowCandidateSearchesDays: string;
  minCandidateSearches: string;
  noAssignedUsers: boolean;
  limit: string;
};

export type JobFilterDraft = {
  view: JobAnalyticsView;
  maxApplied: string;
  minAgeDays: string;
  maxDetailVisits: string;
  limit: string;
};

export const DEFAULT_COMPANY_DRAFT: CompanyFilterDraft = {
  view: "at_risk",
  days: "30",
  minSearches: "2",
  noRecentJobsDays: "30",
  lowCandidateSearchesDays: "30",
  minCandidateSearches: "2",
  noAssignedUsers: true,
  limit: String(DEFAULT_COMPANY_LIMIT),
};

export const DEFAULT_JOB_DRAFT: JobFilterDraft = {
  view: "underperforming",
  maxApplied: "5",
  minAgeDays: "14",
  maxDetailVisits: "50",
  limit: String(DEFAULT_JOB_LIMIT),
};

export const COMPANY_VIEW_LABELS: Record<CompanyAnalyticsView, string> = {
  at_risk: "Kombinované riziko",
  no_recent_jobs: "Bez nových jobů",
  low_candidate_searches: "Nízké hledání kandidátů",
  no_assigned_users: "Bez přiřazeného CS",
};

export const JOB_VIEW_LABELS: Record<JobAnalyticsView, string> = {
  underperforming: "Kombinovaně slabé",
  low_applications: "Málo reakcí",
  old_job: "Staré aktivní joby",
  low_detail_visits: "Nízké návštěvy detailu",
};

export const CRITERIA_LABELS: Record<string, string> = {
  days: "Okno",
  minSearches: "Min. hledání",
  noRecentJobsDays: "Bez jobu",
  lowCandidateSearchesDays: "Hledání",
  minCandidateSearches: "Min. hledání",
  noAssignedUsers: "Bez CS",
  maxApplied: "Max. reakcí",
  minAgeDays: "Min. stáří",
  maxDetailVisits: "Max. návštěv",
};

function parseIntegerInput(
  value: string,
  fallback: number,
  min = 0,
  max = Number.POSITIVE_INFINITY
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function toCompanyQuery(draft: CompanyFilterDraft): CompanyAnalyticsQuery {
  const limit = parseIntegerInput(draft.limit, DEFAULT_COMPANY_LIMIT, 1, 100);

  switch (draft.view) {
    case "no_recent_jobs":
      return {
        view: draft.view,
        days: parseIntegerInput(draft.days, 30, 1),
        limit,
      };
    case "low_candidate_searches":
      return {
        view: draft.view,
        days: parseIntegerInput(draft.days, 30, 1),
        minSearches: parseIntegerInput(draft.minSearches, 2, 1),
        limit,
      };
    case "no_assigned_users":
      return {
        view: draft.view,
        limit,
      };
    case "at_risk":
      return {
        view: draft.view,
        noRecentJobsDays: parseIntegerInput(draft.noRecentJobsDays, 30, 1),
        lowCandidateSearchesDays: parseIntegerInput(
          draft.lowCandidateSearchesDays,
          30,
          1
        ),
        minCandidateSearches: parseIntegerInput(
          draft.minCandidateSearches,
          2,
          1
        ),
        noAssignedUsers: draft.noAssignedUsers,
        limit,
      };
  }
}

export function toJobQuery(draft: JobFilterDraft): JobAnalyticsQuery {
  const limit = parseIntegerInput(draft.limit, DEFAULT_JOB_LIMIT, 1, 100);

  switch (draft.view) {
    case "low_applications":
      return {
        view: draft.view,
        maxApplied: parseIntegerInput(draft.maxApplied, 5, 1),
        limit,
      };
    case "old_job":
      return {
        view: draft.view,
        minAgeDays: parseIntegerInput(draft.minAgeDays, 14, 1),
        limit,
      };
    case "low_detail_visits":
      return {
        view: draft.view,
        maxDetailVisits: parseIntegerInput(draft.maxDetailVisits, 50, 0),
        limit,
      };
    case "underperforming":
      return {
        view: draft.view,
        maxApplied: parseIntegerInput(draft.maxApplied, 5, 1),
        minAgeDays: parseIntegerInput(draft.minAgeDays, 14, 1),
        maxDetailVisits: parseIntegerInput(draft.maxDetailVisits, 50, 0),
        limit,
      };
  }
}
