import { JOB_TERMS, type JobTerm } from "../../lib/openapi/types";
import type {
  JobAnalyticsInput,
  JobAnalyticsSnapshot,
  JobPerformanceSummary,
  JobTermAnalytics,
  RankedJobMetric,
  RankedJobMetricRow,
} from "./types";

function getNumber(value?: number | null): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : 0;
}

function getCompanyLabel(input: JobAnalyticsInput["job"]): string {
  const companyName = input.author?.companyName?.trim();
  if (companyName) {
    return companyName;
  }

  const fullName = [input.author?.givenName, input.author?.familyName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return fullName || "Neznámý autor";
}

function getConversionRatio(appliedTotal: number, jobVisits: number): number | null {
  return jobVisits > 0 ? appliedTotal / jobVisits : null;
}

function getStatusSummary(appliedTotal: number, jobVisits: number): string {
  if (jobVisits === 0 && appliedTotal > 0) {
    return "Přihlášky bez tracked návštěv";
  }

  if (jobVisits === 0) {
    return "Žádné návštěvy";
  }

  if (appliedTotal === 0) {
    return "Návštěvy bez reakcí";
  }

  return "Aktivní job";
}

function toTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getAverage(total: number, count: number): number {
  return count > 0 ? total / count : 0;
}

function createRankedRow(input: JobAnalyticsInput, metric: RankedJobMetric): RankedJobMetricRow {
  const performance = buildJobPerformanceSummary(input);
  const primaryValue = metric === "appliedTotal" ? performance.appliedTotal : performance.jobVisits;
  const secondaryValue = metric === "appliedTotal" ? performance.jobVisits : performance.appliedTotal;

  return {
    jobId: performance.jobId,
    title: performance.title,
    companyLabel: performance.companyLabel,
    term: performance.term,
    metric,
    primaryValue,
    secondaryValue,
    freshnessAt: performance.freshnessAt,
    statusSummary: performance.statusSummary,
  };
}

function sortRankedRows(inputs: JobAnalyticsInput[], metric: RankedJobMetric): RankedJobMetricRow[] {
  return inputs
    .map((input) => createRankedRow(input, metric))
    .sort((left, right) => {
      return (
        right.primaryValue - left.primaryValue ||
        right.secondaryValue - left.secondaryValue ||
        toTimestamp(right.freshnessAt) - toTimestamp(left.freshnessAt) ||
        left.title.localeCompare(right.title, "cs")
      );
    });
}

function buildTermAnalytics(inputs: JobAnalyticsInput[], term: JobTerm): JobTermAnalytics {
  const termItems = inputs.map(buildJobPerformanceSummary).filter((item) => item.term === term);
  const total = termItems.reduce((sum, item) => sum + item.total, 0);
  const appliedTotal = termItems.reduce((sum, item) => sum + item.appliedTotal, 0);
  const applied = termItems.reduce((sum, item) => sum + item.applied, 0);
  const accepted = termItems.reduce((sum, item) => sum + item.accepted, 0);
  const ignored = termItems.reduce((sum, item) => sum + item.ignored, 0);
  const rejected = termItems.reduce((sum, item) => sum + item.rejected, 0);
  const jobVisits = termItems.reduce((sum, item) => sum + item.jobVisits, 0);

  return {
    term,
    jobsCount: termItems.length,
    total,
    appliedTotal,
    applied,
    accepted,
    ignored,
    rejected,
    jobVisits,
    averageAppliesPerJob: getAverage(appliedTotal, termItems.length),
    averageVisitsPerJob: getAverage(jobVisits, termItems.length),
    conversionRatio: getConversionRatio(appliedTotal, jobVisits),
  };
}

export function buildJobPerformanceSummary(input: JobAnalyticsInput): JobPerformanceSummary {
  const stats = input.stats ?? input.job.stats;
  const appliedTotal = getNumber(stats?.appliedTotal);
  const jobVisits = getNumber(stats?.jobVisits);

  return {
    jobId: input.job.id,
    title: input.job.description,
    companyLabel: getCompanyLabel(input.job),
    term: input.job.term,
    total: getNumber(stats?.total),
    appliedTotal,
    applied: getNumber(stats?.applied),
    accepted: getNumber(stats?.accepted),
    ignored: getNumber(stats?.ignored),
    rejected: getNumber(stats?.rejected),
    jobVisits,
    conversionRatio: getConversionRatio(appliedTotal, jobVisits),
    freshnessAt: stats?.updatedAt ?? null,
    statusSummary: getStatusSummary(appliedTotal, jobVisits),
    isBanned: input.job.isBanned === true,
    isRelevant: input.job.viewer?.isRelevant ?? input.job.isRelevant ?? null,
    offerExpiresAt: input.job.offerExpiresAt ?? null,
    candidatesAccessExpiresAt: input.job.candidatesAccessExpiresAt ?? null,
  };
}

export function buildJobAnalyticsSnapshot(inputs: JobAnalyticsInput[]): JobAnalyticsSnapshot {
  const performanceItems = inputs.map(buildJobPerformanceSummary);
  const total = performanceItems.reduce((sum, item) => sum + item.total, 0);
  const appliedTotal = performanceItems.reduce((sum, item) => sum + item.appliedTotal, 0);
  const applied = performanceItems.reduce((sum, item) => sum + item.applied, 0);
  const accepted = performanceItems.reduce((sum, item) => sum + item.accepted, 0);
  const ignored = performanceItems.reduce((sum, item) => sum + item.ignored, 0);
  const rejected = performanceItems.reduce((sum, item) => sum + item.rejected, 0);
  const jobVisits = performanceItems.reduce((sum, item) => sum + item.jobVisits, 0);

  const lowEngagementJobs = performanceItems
    .filter((item) => item.appliedTotal === 0 || item.jobVisits === 0)
    .sort((left, right) => {
      const leftPriority = left.jobVisits === 0 && left.appliedTotal === 0 ? 0 : left.appliedTotal === 0 ? 1 : 2;
      const rightPriority = right.jobVisits === 0 && right.appliedTotal === 0 ? 0 : right.appliedTotal === 0 ? 1 : 2;

      return (
        leftPriority - rightPriority ||
        toTimestamp(right.freshnessAt) - toTimestamp(left.freshnessAt) ||
        left.title.localeCompare(right.title, "cs")
      );
    })
    .slice(0, 5);

  return {
    jobsCount: performanceItems.length,
    total,
    appliedTotal,
    applied,
    accepted,
    ignored,
    rejected,
    jobVisits,
    averageAppliesPerJob: getAverage(appliedTotal, performanceItems.length),
    averageVisitsPerJob: getAverage(jobVisits, performanceItems.length),
    conversionRatio: getConversionRatio(appliedTotal, jobVisits),
    termBreakdown: JOB_TERMS.map((term) => buildTermAnalytics(inputs, term)),
    topAppliedJobs: sortRankedRows(inputs, "appliedTotal").slice(0, 5),
    topVisitedJobs: sortRankedRows(inputs, "jobVisits").slice(0, 5),
    lowEngagementJobs,
  };
}
