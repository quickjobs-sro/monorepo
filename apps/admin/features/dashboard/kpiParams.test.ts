import assert from "node:assert/strict";
import {
  buildJobsPerformanceKpiParams,
  buildTrafficKpiParams,
} from "./kpiParams";
import {
  dashboardJobsPerformanceQueryKey,
  dashboardTrafficQueryKey,
} from "./queries";

const NOW = new Date("2026-05-15T12:00:00.000Z");

assert.deepEqual(buildTrafficKpiParams(NOW), {
  from: "2026-04-15T12:00:00.000Z",
  to: "2026-05-15T12:00:00.000Z",
  timezone: "Europe/Prague",
  groupBy: "day",
});

assert.deepEqual(buildJobsPerformanceKpiParams(NOW), {
  from: "2026-04-15T12:00:00.000Z",
  to: "2026-05-15T12:00:00.000Z",
  sort: "visits",
  limit: 10,
});

assert.deepEqual(buildJobsPerformanceKpiParams(NOW, 500), {
  from: "2026-04-15T12:00:00.000Z",
  to: "2026-05-15T12:00:00.000Z",
  sort: "visits",
  limit: 100,
});

assert.deepEqual(dashboardTrafficQueryKey(buildTrafficKpiParams(NOW)), [
  "admin",
  "dashboard",
  "kpis",
  "traffic",
  "2026-04-15T12:00:00.000Z",
  "2026-05-15T12:00:00.000Z",
  "Europe/Prague",
  "day",
]);

assert.deepEqual(
  dashboardJobsPerformanceQueryKey(buildJobsPerformanceKpiParams(NOW)),
  [
    "admin",
    "dashboard",
    "kpis",
    "jobs-performance",
    "2026-04-15T12:00:00.000Z",
    "2026-05-15T12:00:00.000Z",
    "visits",
    10,
  ]
);
