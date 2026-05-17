import type {
  AdminKpisJobsPerformanceQuery,
  AdminKpisTrafficQuery,
} from "./kpiParams";

export function dashboardTrafficQueryKey(params: AdminKpisTrafficQuery) {
  return [
    "admin",
    "dashboard",
    "kpis",
    "traffic",
    params.from,
    params.to,
    params.timezone,
    params.groupBy,
  ] as const;
}

export function dashboardJobsPerformanceQueryKey(
  params: AdminKpisJobsPerformanceQuery
) {
  return [
    "admin",
    "dashboard",
    "kpis",
    "jobs-performance",
    params.from,
    params.to,
    params.sort,
    params.limit,
  ] as const;
}
