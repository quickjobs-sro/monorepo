export type CompanyCriterion = "no_recent_jobs" | "low_candidate_searches" | "no_assigned_users";
export type JobCriterion = "low_applications" | "old_job" | "low_detail_visits";

export type CompanyAnalyticsView = CompanyCriterion | "at_risk";
export type JobAnalyticsView = JobCriterion | "underperforming";

export type AdminAnalyticsCompany = {
  id: number;
  name: string;
  ico: string | null;
  slug: string | null;
  web: string | null;
  hubspotLink: string | null;
  paidUntil: string;
  assignedUserCount: number;
  recentJobsCount: number | null;
  candidateSearchCount: number | null;
  lastJobCreatedAt: string | null;
  lastCandidateSearchAt: string | null;
  matchedCriteria: CompanyCriterion[];
};

export type AdminAnalyticsCompanyResponse = {
  criteria: Record<string, number | boolean>;
  items: AdminAnalyticsCompany[];
  pageInfo: { hasNext: boolean };
};

export type AdminAnalyticsJob = {
  id: number;
  descriptionPreview: string | null;
  term: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  offerExpiresAt: string | null;
  authorId: number;
  company: { id: number; name: string; slug: string | null } | null;
  appliedCount: number;
  detailVisitCount: number;
  ageDays: number;
  matchedCriteria: JobCriterion[];
};

export type AdminAnalyticsJobResponse = {
  criteria: Record<string, number>;
  items: AdminAnalyticsJob[];
  pageInfo: { hasNext: boolean };
};

export type CompanyAnalyticsQuery = {
  view: CompanyAnalyticsView;
  days?: number;
  minSearches?: number;
  noRecentJobsDays?: number;
  lowCandidateSearchesDays?: number;
  minCandidateSearches?: number;
  noAssignedUsers?: boolean;
  limit?: number;
  afterId?: number;
};

export type JobAnalyticsQuery = {
  view: JobAnalyticsView;
  maxApplied?: number;
  minAgeDays?: number;
  maxDetailVisits?: number;
  limit?: number;
  afterId?: number;
};
