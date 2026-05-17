import assert from "node:assert/strict";
import {
  buildCompanyAnalyticsRequest,
  buildCustomerSuccessExportRequest,
  buildJobAnalyticsRequest,
  formatCompanyCriterionLabel,
  formatJobCriterionLabel,
} from "./params";
import {
  DEFAULT_COMPANY_DRAFT,
  DEFAULT_JOB_DRAFT,
  toCompanyQuery,
  toJobQuery,
} from "./config";

assert.deepEqual(
  buildCompanyAnalyticsRequest({
    view: "no_recent_jobs",
    days: 45,
    limit: 25,
    afterId: 123,
  }),
  {
    path: "/admin/analytics/companies/no-recent-jobs",
    query: {
      days: 45,
      limit: 25,
      afterId: 123,
    },
  }
);

assert.deepEqual(
  buildCompanyAnalyticsRequest({
    view: "at_risk",
    noRecentJobsDays: 30,
    lowCandidateSearchesDays: 30,
    minCandidateSearches: 2,
    noAssignedUsers: false,
    limit: 30,
  }),
  {
    path: "/admin/analytics/companies/at-risk",
    query: {
      noRecentJobsDays: 30,
      lowCandidateSearchesDays: 30,
      minCandidateSearches: 2,
      limit: 30,
    },
  }
);

assert.deepEqual(
  buildJobAnalyticsRequest({
    view: "underperforming",
    maxApplied: 5,
    minAgeDays: 14,
    maxDetailVisits: 50,
    limit: 30,
    afterId: 987,
  }),
  {
    path: "/admin/analytics/jobs/underperforming",
    query: {
      maxApplied: 5,
      minAgeDays: 14,
      maxDetailVisits: 50,
      limit: 30,
      afterId: 987,
    },
  }
);

assert.deepEqual(
  buildJobAnalyticsRequest({
    view: "low_detail_visits",
    maxDetailVisits: 0,
    limit: 500,
  }),
  {
    path: "/admin/analytics/jobs/low-detail-visits",
    query: {
      maxDetailVisits: 0,
      limit: 100,
    },
  }
);

assert.equal(formatCompanyCriterionLabel("no_recent_jobs"), "Bez nových jobů");
assert.equal(formatCompanyCriterionLabel("low_candidate_searches"), "Nízké hledání kandidátů");
assert.equal(formatCompanyCriterionLabel("no_assigned_users"), "Bez přiřazeného CS");
assert.equal(formatJobCriterionLabel("low_applications"), "Málo reakcí");
assert.equal(formatJobCriterionLabel("old_job"), "Starý aktivní job");
assert.equal(formatJobCriterionLabel("low_detail_visits"), "Nízké návštěvy detailu");

assert.deepEqual(
  toCompanyQuery({
    ...DEFAULT_COMPANY_DRAFT,
    minCandidateSearches: "0",
    limit: "500",
  }),
  {
    view: "at_risk",
    noRecentJobsDays: 30,
    lowCandidateSearchesDays: 30,
    minCandidateSearches: 1,
    noAssignedUsers: true,
    limit: 100,
  }
);

assert.deepEqual(
  toJobQuery({
    ...DEFAULT_JOB_DRAFT,
    maxApplied: "0",
    maxDetailVisits: "0",
    limit: "500",
  }),
  {
    view: "underperforming",
    maxApplied: 1,
    minAgeDays: 14,
    maxDetailVisits: 0,
    limit: 100,
  }
);

assert.deepEqual(
  buildCustomerSuccessExportRequest({
    company: {
      view: "at_risk",
      noRecentJobsDays: 30,
      lowCandidateSearchesDays: 14,
      minCandidateSearches: 2,
      noAssignedUsers: true,
      limit: 30,
      afterId: 123,
    },
    job: {
      view: "underperforming",
      maxApplied: 5,
      minAgeDays: 14,
      maxDetailVisits: 0,
      limit: 30,
      afterId: 987,
    },
    companyLimit: 100,
    jobLimit: 200,
  }),
  {
    path: "/admin/analytics/customer-success/export",
    query: {
      noRecentJobsDays: 30,
      lowCandidateSearchesDays: 14,
      minCandidateSearches: 2,
      noAssignedUsers: true,
      maxApplied: 5,
      minAgeDays: 14,
      maxDetailVisits: 0,
      companyLimit: 100,
      jobLimit: 200,
      format: "json",
    },
  }
);

assert.deepEqual(
  buildCustomerSuccessExportRequest({
    company: {
      view: "at_risk",
      noRecentJobsDays: 30,
      lowCandidateSearchesDays: 30,
      minCandidateSearches: 2,
      noAssignedUsers: false,
      limit: 30,
      afterId: 123,
    },
    job: {
      view: "low_detail_visits",
      maxDetailVisits: 0,
      limit: 30,
      afterId: 987,
    },
    companyLimit: 0,
    jobLimit: 5000,
  }),
  {
    path: "/admin/analytics/customer-success/export",
    query: {
      noRecentJobsDays: 30,
      lowCandidateSearchesDays: 30,
      minCandidateSearches: 2,
      maxDetailVisits: 0,
      companyLimit: 1,
      jobLimit: 1000,
      format: "json",
    },
  }
);

assert.deepEqual(
  buildCustomerSuccessExportRequest({
    company: {
      view: "low_candidate_searches",
      days: 45,
      minSearches: 3,
      limit: 88,
      afterId: 123,
    },
    job: {
      view: "old_job",
      minAgeDays: 21,
      limit: 88,
      afterId: 987,
    },
  }),
  {
    path: "/admin/analytics/customer-success/export",
    query: {
      lowCandidateSearchesDays: 45,
      minCandidateSearches: 3,
      minAgeDays: 21,
      companyLimit: 100,
      jobLimit: 100,
      format: "json",
    },
  }
);

assert.deepEqual(
  buildCustomerSuccessExportRequest({
    company: {
      view: "no_assigned_users",
      limit: 30,
      afterId: 123,
    },
    job: {
      view: "low_applications",
      maxApplied: 4,
      limit: 30,
      afterId: 987,
    },
  }),
  {
    path: "/admin/analytics/customer-success/export",
    query: {
      noAssignedUsers: true,
      maxApplied: 4,
      companyLimit: 100,
      jobLimit: 100,
      format: "json",
    },
  }
);
