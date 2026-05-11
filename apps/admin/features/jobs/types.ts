import type { CanonicalJob, CanonicalJobStats, JobTerm } from "../../lib/openapi/types";

export type JobsTermFilter = JobTerm | "all";

export type JobAnalyticsInput = {
  job: CanonicalJob;
  stats?: CanonicalJobStats | null;
};

export type JobPerformanceSummary = {
  jobId: number;
  title: string;
  companyLabel: string;
  term: JobTerm;
  total: number;
  appliedTotal: number;
  applied: number;
  accepted: number;
  ignored: number;
  rejected: number;
  jobVisits: number;
  conversionRatio: number | null;
  freshnessAt: string | null;
  statusSummary: string;
  isBanned: boolean;
  isRelevant: boolean | null;
  offerExpiresAt: string | null;
  candidatesAccessExpiresAt: string | null;
};

export type RankedJobMetric = "appliedTotal" | "jobVisits";

export type RankedJobMetricRow = {
  jobId: number;
  title: string;
  companyLabel: string;
  term: JobTerm;
  metric: RankedJobMetric;
  primaryValue: number;
  secondaryValue: number;
  freshnessAt: string | null;
  statusSummary: string;
};

export type JobTermAnalytics = {
  term: JobTerm;
  jobsCount: number;
  total: number;
  appliedTotal: number;
  applied: number;
  accepted: number;
  ignored: number;
  rejected: number;
  jobVisits: number;
  averageAppliesPerJob: number;
  averageVisitsPerJob: number;
  conversionRatio: number | null;
};

export type JobAnalyticsSnapshot = {
  jobsCount: number;
  total: number;
  appliedTotal: number;
  applied: number;
  accepted: number;
  ignored: number;
  rejected: number;
  jobVisits: number;
  averageAppliesPerJob: number;
  averageVisitsPerJob: number;
  conversionRatio: number | null;
  termBreakdown: JobTermAnalytics[];
  topAppliedJobs: RankedJobMetricRow[];
  topVisitedJobs: RankedJobMetricRow[];
  lowEngagementJobs: JobPerformanceSummary[];
};
