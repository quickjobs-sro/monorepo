const assert = require("node:assert/strict");
const { buildDashboardKpiSnapshot } = require("./analytics");

const NOW = new Date("2026-05-08T12:00:00.000Z");

function createJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    description: "Promo akce v obchodním centru",
    term: "one_time",
    author: {
      companyName: "QuickJobs Test Company",
    },
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
    offerExpiresAt: "2026-05-20T12:00:00.000Z",
    stats: createStats(),
    viewer: {
      isRelevant: true,
    },
    ...overrides,
  };
}

function createStats(overrides: Record<string, unknown> = {}) {
  return {
    jobId: 1,
    appliedTotal: 4,
    jobVisits: 20,
    total: 7,
    applied: 4,
    accepted: 2,
    ignored: 1,
    rejected: 1,
    updatedAt: "2026-05-08T10:00:00.000Z",
    ...overrides,
  };
}

const snapshot = buildDashboardKpiSnapshot({
  now: NOW,
  jobs: [
    createJob({
      id: 11,
      description: "Fresh visited job",
      createdAt: "2026-05-04T09:00:00.000Z",
      stats: createStats({ jobId: 11, appliedTotal: 5, jobVisits: 40, accepted: 3, rejected: 1 }),
    }),
    createJob({
      id: 12,
      description: "Thirty day job",
      createdAt: "2026-04-12T09:00:00.000Z",
      stats: createStats({ jobId: 12, appliedTotal: 0, jobVisits: 0, accepted: 0, rejected: 0 }),
    }),
    createJob({
      id: 13,
      description: "Old stale expiring job",
      createdAt: "2026-03-01T09:00:00.000Z",
      offerExpiresAt: "2026-05-10T12:00:00.000Z",
      stats: createStats({
        jobId: 13,
        appliedTotal: 2,
        jobVisits: 0,
        accepted: 0,
        rejected: 2,
        updatedAt: "2026-05-06T09:00:00.000Z",
      }),
      viewer: {
        isRelevant: false,
      },
    }),
    createJob({
      id: 14,
      description: "Expired banned job",
      createdAt: "2026-02-01T09:00:00.000Z",
      offerExpiresAt: "2026-05-01T12:00:00.000Z",
      isBanned: true,
      stats: createStats({ jobId: 14, appliedTotal: 0, jobVisits: 10, accepted: 0, rejected: 0 }),
    }),
  ],
  companies: [
    {
      id: 1,
      name: "Complete Company",
      logo: "logo.png",
      web: "https://example.com",
      contacts: [{ email: "hr@example.com" }],
    },
    {
      id: 2,
      name: "Missing Everything",
      contacts: [],
    },
  ],
  schools: [
    { id: 1, name: "School A", city: "Praha" },
    { id: 2, name: "School B", city: "Brno" },
    { id: 3, name: "School C", city: "Praha" },
  ],
  feedback: [
    { id: 1, rating: 5, createdAt: "2026-05-08T11:00:00.000Z" },
    { id: 2, rating: 2, createdAt: "2026-05-07T10:00:00.000Z" },
    { id: 3, rating: null, createdAt: "2026-05-06T10:00:00.000Z" },
  ],
});

assert.equal(snapshot.jobs.total, 4);
assert.equal(snapshot.jobs.createdLast30Days, 2);
assert.equal(snapshot.jobs.createdLast7Days, 1);
assert.equal(snapshot.jobs.lifetimeVisits, 50);
assert.equal(snapshot.jobs.appliedTotal, 7);
assert.equal(snapshot.jobs.accepted, 3);
assert.equal(snapshot.jobs.rejected, 3);
assert.equal(snapshot.jobs.conversionRatio, 7 / 50);
assert.equal(snapshot.jobs.acceptedRate, 3 / 7);
assert.equal(snapshot.jobs.withoutVisits, 2);
assert.equal(snapshot.jobs.withoutReactions, 2);
assert.equal(snapshot.jobs.banned, 1);
assert.equal(snapshot.jobs.notRelevant, 1);
assert.equal(snapshot.jobs.expiredOffers, 1);
assert.equal(snapshot.jobs.expiringOffers7Days, 1);
assert.equal(snapshot.jobs.staleStats, 1);
assert.equal(snapshot.jobs.topVisited[0]?.jobId, 11);
assert.equal(snapshot.jobs.riskJobs[0]?.jobId, 14);
assert.deepEqual(snapshot.jobs.riskJobs[0]?.reasons, ["Banned", "Offer expired", "No apply reactions"]);

assert.equal(snapshot.catalog.companiesTotal, 2);
assert.equal(snapshot.catalog.companiesMissingLogo, 1);
assert.equal(snapshot.catalog.companiesMissingWeb, 1);
assert.equal(snapshot.catalog.companiesMissingContact, 1);
assert.equal(snapshot.catalog.schoolsTotal, 3);
assert.equal(snapshot.catalog.schoolCitiesTotal, 2);

assert.equal(snapshot.feedback.total, 3);
assert.equal(snapshot.feedback.ratedTotal, 2);
assert.equal(snapshot.feedback.averageRating, 3.5);
assert.equal(snapshot.feedback.lowRatings, 1);
assert.equal(snapshot.feedback.latestFeedbackAt, "2026-05-08T11:00:00.000Z");

const noVisitSnapshot = buildDashboardKpiSnapshot({
  now: NOW,
  jobs: [createJob({ stats: createStats({ appliedTotal: 3, jobVisits: 0 }) })],
  companies: [],
  schools: [],
  feedback: [],
});

assert.equal(noVisitSnapshot.jobs.conversionRatio, null);
