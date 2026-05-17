const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
const DEFAULT_PERFORMANCE_LIMIT = 10;
const MAX_PERFORMANCE_LIMIT = 100;

export type AdminKpisTrafficQuery = {
  from: string;
  to: string;
  timezone: "Europe/Prague";
  groupBy: "day";
};

export type AdminKpisJobsPerformanceQuery = {
  from: string;
  to: string;
  sort: "visits";
  limit: number;
};

function toIsoDateTime(value: Date): string {
  return value.toISOString();
}

function getRollingRange(now: Date) {
  const to = new Date(now.getTime());
  const from = new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

  return {
    from: toIsoDateTime(from),
    to: toIsoDateTime(to),
  };
}

function clampPerformanceLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_PERFORMANCE_LIMIT;
  }

  return Math.min(MAX_PERFORMANCE_LIMIT, Math.max(1, Math.trunc(limit)));
}

export function buildTrafficKpiParams(now = new Date()): AdminKpisTrafficQuery {
  return {
    ...getRollingRange(now),
    timezone: "Europe/Prague",
    groupBy: "day",
  };
}

export function buildJobsPerformanceKpiParams(
  now = new Date(),
  limit = DEFAULT_PERFORMANCE_LIMIT
): AdminKpisJobsPerformanceQuery {
  return {
    ...getRollingRange(now),
    sort: "visits",
    limit: clampPerformanceLimit(limit),
  };
}
