import type { JobTerm, PublicJob, PublicJobStats } from "../../lib/openapi/types";

export type JobsTermFilter = JobTerm | "all";

export type JobAnalyticsInput = {
  job: PublicJob;
  stats?: PublicJobStats | null;
};

export type JobPerformanceSummary = {
  jobId: number;
  title: string;
  companyLabel: string;
  term: JobTerm;
  appliedTotal: number;
  jobVisits: number;
  conversionRatio: number | null;
  freshnessAt: string | null;
  statusSummary: string;
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
  appliedTotal: number;
  jobVisits: number;
  averageAppliesPerJob: number;
  averageVisitsPerJob: number;
  conversionRatio: number | null;
};

export type JobAnalyticsSnapshot = {
  jobsCount: number;
  appliedTotal: number;
  jobVisits: number;
  averageAppliesPerJob: number;
  averageVisitsPerJob: number;
  conversionRatio: number | null;
  termBreakdown: JobTermAnalytics[];
  topAppliedJobs: RankedJobMetricRow[];
  topVisitedJobs: RankedJobMetricRow[];
  lowEngagementJobs: JobPerformanceSummary[];
};
