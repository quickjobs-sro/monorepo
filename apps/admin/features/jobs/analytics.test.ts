const assert = require("node:assert/strict");
const { buildJobAnalyticsSnapshot, buildJobPerformanceSummary } = require("./analytics");

function createJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    description: "Roznos letáků po centru",
    term: "one_time",
    salary: 180,
    author: {
      companyName: "QuickJobs Test Company",
      email: "jobs@example.com",
    },
    updatedAt: "2026-04-22T10:00:00.000Z",
    ...overrides,
  };
}

function createStats(overrides: Record<string, unknown> = {}) {
  return {
    jobId: 1,
    appliedTotal: 3,
    jobVisits: 12,
    updatedAt: "2026-04-22T11:00:00.000Z",
    ...overrides,
  };
}

const snapshot = buildJobAnalyticsSnapshot([
  {
    job: createJob({
      id: 11,
      description: "Promo akce v obchodním centru",
      term: "one_time",
    }),
    stats: createStats({
      jobId: 11,
      appliedTotal: 5,
      jobVisits: 20,
    }),
  },
  {
    job: createJob({
      id: 12,
      description: "Dlouhodobá výpomoc na recepci",
      term: "long_term",
    }),
    stats: createStats({
      jobId: 12,
      appliedTotal: 0,
      jobVisits: 8,
    }),
  },
  {
    job: createJob({
      id: 13,
      description: "Junior office koordinátor",
      term: "full_time",
    }),
    stats: createStats({
      jobId: 13,
      appliedTotal: 2,
      jobVisits: 0,
    }),
  },
]);

assert.equal(snapshot.jobsCount, 3);
assert.equal(snapshot.appliedTotal, 7);
assert.equal(snapshot.jobVisits, 28);
assert.equal(snapshot.averageAppliesPerJob, 7 / 3);
assert.equal(snapshot.averageVisitsPerJob, 28 / 3);
assert.equal(snapshot.conversionRatio, 7 / 28);
assert.deepEqual(
  snapshot.termBreakdown.map((item: { term: string; jobsCount: number; appliedTotal: number; jobVisits: number }) => ({
    term: item.term,
    jobsCount: item.jobsCount,
    appliedTotal: item.appliedTotal,
    jobVisits: item.jobVisits,
  })),
  [
    {
      term: "one_time",
      jobsCount: 1,
      appliedTotal: 5,
      jobVisits: 20,
    },
    {
      term: "long_term",
      jobsCount: 1,
      appliedTotal: 0,
      jobVisits: 8,
    },
    {
      term: "full_time",
      jobsCount: 1,
      appliedTotal: 2,
      jobVisits: 0,
    },
  ]
);
assert.equal(snapshot.topAppliedJobs[0]?.jobId, 11);
assert.equal(snapshot.topVisitedJobs[0]?.jobId, 11);
assert.equal(snapshot.lowEngagementJobs[0]?.jobId, 12);
assert.equal(snapshot.lowEngagementJobs[1]?.jobId, 13);

const noVisits = buildJobPerformanceSummary({
  job: createJob({ id: 21 }),
  stats: createStats({ jobId: 21, appliedTotal: 0, jobVisits: 0 }),
});
const visitsWithoutApply = buildJobPerformanceSummary({
  job: createJob({ id: 22 }),
  stats: createStats({ jobId: 22, appliedTotal: 0, jobVisits: 9 }),
});
const activeJob = buildJobPerformanceSummary({
  job: createJob({ id: 23 }),
  stats: createStats({ jobId: 23, appliedTotal: 4, jobVisits: 10 }),
});

assert.equal(noVisits.statusSummary, "Žádné návštěvy");
assert.equal(noVisits.conversionRatio, null);
assert.equal(visitsWithoutApply.statusSummary, "Návštěvy bez reakcí");
assert.equal(visitsWithoutApply.conversionRatio, 0);
assert.equal(activeJob.statusSummary, "Aktivní job");
assert.equal(activeJob.conversionRatio, 0.4);
