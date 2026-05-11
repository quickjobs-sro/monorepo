import type { AdminFeedbackItem, CanonicalJob, CompanyLookup, SchoolLookup } from "@/lib/openapi/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const LAST_7_DAYS_MS = 7 * DAY_MS;
const LAST_30_DAYS_MS = 30 * DAY_MS;
const EXPIRING_SOON_MS = 7 * DAY_MS;
const STALE_STATS_MS = DAY_MS;

export type DashboardJobRisk = {
  jobId: number;
  title: string;
  companyLabel: string;
  reasons: string[];
  appliedTotal: number;
  jobVisits: number;
  createdAt: string | null;
  offerExpiresAt: string | null;
  statsUpdatedAt: string | null;
};

export type DashboardRankedJob = {
  jobId: number;
  title: string;
  companyLabel: string;
  value: number;
  secondaryValue: number;
};

export type DashboardJobKpiSnapshot = {
  total: number;
  createdLast30Days: number;
  createdLast7Days: number;
  lifetimeVisits: number;
  appliedTotal: number;
  accepted: number;
  rejected: number;
  conversionRatio: number | null;
  acceptedRate: number | null;
  withoutVisits: number;
  withoutReactions: number;
  banned: number;
  notRelevant: number;
  expiredOffers: number;
  expiringOffers7Days: number;
  staleStats: number;
  topVisited: DashboardRankedJob[];
  topApplied: DashboardRankedJob[];
  riskJobs: DashboardJobRisk[];
};

export type CatalogQualitySnapshot = {
  companiesTotal: number;
  companiesMissingLogo: number;
  companiesMissingWeb: number;
  companiesMissingContact: number;
  schoolsTotal: number;
  schoolCitiesTotal: number;
};

export type FeedbackPulseSnapshot = {
  total: number;
  ratedTotal: number;
  averageRating: number | null;
  lowRatings: number;
  latestFeedbackAt: string | null;
};

export type DashboardKpiSnapshot = {
  jobs: DashboardJobKpiSnapshot;
  catalog: CatalogQualitySnapshot;
  feedback: FeedbackPulseSnapshot;
};

type DashboardAnalyticsInput = {
  jobs: CanonicalJob[];
  companies: CompanyLookup[];
  schools: SchoolLookup[];
  feedback: AdminFeedbackItem[];
  now?: Date;
};

function getNumber(value?: number | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getTimestamp(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isWithinPastWindow(value: string | null | undefined, nowMs: number, windowMs: number): boolean {
  const timestamp = getTimestamp(value);
  return timestamp !== null && timestamp <= nowMs && timestamp >= nowMs - windowMs;
}

function isExpired(value: string | null | undefined, nowMs: number): boolean {
  const timestamp = getTimestamp(value);
  return timestamp !== null && timestamp < nowMs;
}

function isExpiringSoon(value: string | null | undefined, nowMs: number): boolean {
  const timestamp = getTimestamp(value);
  return timestamp !== null && timestamp >= nowMs && timestamp <= nowMs + EXPIRING_SOON_MS;
}

function isStatsStale(value: string | null | undefined, nowMs: number): boolean {
  const timestamp = getTimestamp(value);
  return timestamp === null || timestamp < nowMs - STALE_STATS_MS;
}

function getCompanyLabel(job: CanonicalJob): string {
  const companyName = job.author?.companyName?.trim();
  if (companyName) {
    return companyName;
  }

  const fullName = [job.author?.givenName, job.author?.familyName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return fullName || "Neznámý autor";
}

function getRatio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function buildRankedJob(job: CanonicalJob, metric: "jobVisits" | "appliedTotal"): DashboardRankedJob {
  const appliedTotal = getNumber(job.stats?.appliedTotal);
  const jobVisits = getNumber(job.stats?.jobVisits);
  const value = metric === "jobVisits" ? jobVisits : appliedTotal;
  const secondaryValue = metric === "jobVisits" ? appliedTotal : jobVisits;

  return {
    jobId: job.id,
    title: job.description,
    companyLabel: getCompanyLabel(job),
    value,
    secondaryValue,
  };
}

function sortRankedJobs(jobs: CanonicalJob[], metric: "jobVisits" | "appliedTotal"): DashboardRankedJob[] {
  return jobs
    .map((job) => buildRankedJob(job, metric))
    .sort((left, right) => {
      return right.value - left.value || right.secondaryValue - left.secondaryValue || left.title.localeCompare(right.title, "cs");
    })
    .slice(0, 5);
}

function buildRiskReasons(job: CanonicalJob, nowMs: number): string[] {
  const appliedTotal = getNumber(job.stats?.appliedTotal);
  const jobVisits = getNumber(job.stats?.jobVisits);
  const reasons: string[] = [];

  if (job.isBanned === true) {
    reasons.push("Banned");
  }

  if ((job.viewer?.isRelevant ?? job.isRelevant) === false) {
    reasons.push("Not relevant");
  }

  if (isExpired(job.offerExpiresAt, nowMs)) {
    reasons.push("Offer expired");
  } else if (isExpiringSoon(job.offerExpiresAt, nowMs)) {
    reasons.push("Offer expiring");
  }

  if (jobVisits === 0) {
    reasons.push("No visits");
  }

  if (appliedTotal === 0) {
    reasons.push("No apply reactions");
  }

  if (isStatsStale(job.stats?.updatedAt, nowMs)) {
    reasons.push("Stale stats");
  }

  return reasons;
}

function getRiskPriority(reasons: string[]): number {
  const priority = ["Banned", "Offer expired", "Not relevant", "No visits", "No apply reactions", "Offer expiring", "Stale stats"];
  const firstIndex = priority.findIndex((reason) => reasons.includes(reason));
  return firstIndex === -1 ? priority.length : firstIndex;
}

function buildJobRisk(job: CanonicalJob, nowMs: number): DashboardJobRisk | null {
  const reasons = buildRiskReasons(job, nowMs);
  if (reasons.length === 0) {
    return null;
  }

  return {
    jobId: job.id,
    title: job.description,
    companyLabel: getCompanyLabel(job),
    reasons,
    appliedTotal: getNumber(job.stats?.appliedTotal),
    jobVisits: getNumber(job.stats?.jobVisits),
    createdAt: job.createdAt ?? null,
    offerExpiresAt: job.offerExpiresAt ?? null,
    statsUpdatedAt: job.stats?.updatedAt ?? null,
  };
}

function buildJobSnapshot(jobs: CanonicalJob[], now: Date): DashboardJobKpiSnapshot {
  const nowMs = now.getTime();
  const appliedTotal = jobs.reduce((sum, job) => sum + getNumber(job.stats?.appliedTotal), 0);
  const lifetimeVisits = jobs.reduce((sum, job) => sum + getNumber(job.stats?.jobVisits), 0);
  const accepted = jobs.reduce((sum, job) => sum + getNumber(job.stats?.accepted), 0);
  const rejected = jobs.reduce((sum, job) => sum + getNumber(job.stats?.rejected), 0);
  const riskJobs = jobs
    .map((job) => buildJobRisk(job, nowMs))
    .filter((job): job is DashboardJobRisk => job !== null)
    .sort((left, right) => {
      return (
        getRiskPriority(left.reasons) - getRiskPriority(right.reasons) ||
        right.reasons.length - left.reasons.length ||
        right.jobVisits - left.jobVisits ||
        left.title.localeCompare(right.title, "cs")
      );
    })
    .slice(0, 6);

  return {
    total: jobs.length,
    createdLast30Days: jobs.filter((job) => isWithinPastWindow(job.createdAt, nowMs, LAST_30_DAYS_MS)).length,
    createdLast7Days: jobs.filter((job) => isWithinPastWindow(job.createdAt, nowMs, LAST_7_DAYS_MS)).length,
    lifetimeVisits,
    appliedTotal,
    accepted,
    rejected,
    conversionRatio: getRatio(appliedTotal, lifetimeVisits),
    acceptedRate: getRatio(accepted, appliedTotal),
    withoutVisits: jobs.filter((job) => getNumber(job.stats?.jobVisits) === 0).length,
    withoutReactions: jobs.filter((job) => getNumber(job.stats?.appliedTotal) === 0).length,
    banned: jobs.filter((job) => job.isBanned === true).length,
    notRelevant: jobs.filter((job) => (job.viewer?.isRelevant ?? job.isRelevant) === false).length,
    expiredOffers: jobs.filter((job) => isExpired(job.offerExpiresAt, nowMs)).length,
    expiringOffers7Days: jobs.filter((job) => isExpiringSoon(job.offerExpiresAt, nowMs)).length,
    staleStats: jobs.filter((job) => isStatsStale(job.stats?.updatedAt, nowMs)).length,
    topVisited: sortRankedJobs(jobs, "jobVisits"),
    topApplied: sortRankedJobs(jobs, "appliedTotal"),
    riskJobs,
  };
}

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

function buildCatalogSnapshot(companies: CompanyLookup[], schools: SchoolLookup[]): CatalogQualitySnapshot {
  return {
    companiesTotal: companies.length,
    companiesMissingLogo: companies.filter((company) => !hasText(company.logo)).length,
    companiesMissingWeb: companies.filter((company) => !hasText(company.web)).length,
    companiesMissingContact: companies.filter((company) => company.contacts.length === 0).length,
    schoolsTotal: schools.length,
    schoolCitiesTotal: new Set(schools.map((school) => school.city?.trim()).filter(Boolean)).size,
  };
}

function buildFeedbackSnapshot(feedback: AdminFeedbackItem[]): FeedbackPulseSnapshot {
  const ratings = feedback.map((item) => item.rating).filter((rating): rating is number => typeof rating === "number");
  const latestFeedbackAt =
    feedback
      .map((item) => item.createdAt)
      .filter(Boolean)
      .sort((left, right) => {
        return (getTimestamp(right) ?? 0) - (getTimestamp(left) ?? 0);
      })[0] ?? null;

  return {
    total: feedback.length,
    ratedTotal: ratings.length,
    averageRating: ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null,
    lowRatings: ratings.filter((rating) => rating <= 2).length,
    latestFeedbackAt,
  };
}

export function buildDashboardKpiSnapshot(input: DashboardAnalyticsInput): DashboardKpiSnapshot {
  const now = input.now ?? new Date();

  return {
    jobs: buildJobSnapshot(input.jobs, now),
    catalog: buildCatalogSnapshot(input.companies, input.schools),
    feedback: buildFeedbackSnapshot(input.feedback),
  };
}
