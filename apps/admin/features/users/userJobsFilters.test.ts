const assert = require("node:assert/strict");
const {
  buildUserJobsQueryParams,
  USER_AUTHORED_JOBS_PAGE_SIZE,
} = require("./userJobsFilters");

assert.equal(USER_AUTHORED_JOBS_PAGE_SIZE, 25);

assert.deepEqual(
  buildUserJobsQueryParams({
    term: "all",
    status: "all",
  }),
  {
    limit: 25,
    afterId: undefined,
    term: undefined,
    status: undefined,
  },
);

assert.deepEqual(
  buildUserJobsQueryParams({
    afterId: 123,
    term: "one_time",
    status: "active",
  }),
  {
    limit: 25,
    afterId: 123,
    term: ["one_time"],
    status: ["active"],
  },
);
