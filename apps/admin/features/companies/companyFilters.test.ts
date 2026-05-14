const assert = require("node:assert/strict");
const {
  buildCompaniesListFilterState,
  buildCompaniesQueryParams,
  getActiveMissingCompanyFilterLabels,
  hasMissingCompanyFilters,
} = require("./companyFilters");

const noMissingFilters = {
  missingWeb: false,
  missingLogo: false,
  missingContact: false,
};

assert.deepEqual(buildCompaniesListFilterState("  acme  ", noMissingFilters), {
  q: "acme",
  ...noMissingFilters,
});
assert.equal(hasMissingCompanyFilters(noMissingFilters), false);
assert.deepEqual(getActiveMissingCompanyFilterLabels(noMissingFilters), []);

const missingFilters = {
  missingWeb: true,
  missingLogo: false,
  missingContact: true,
};

assert.equal(hasMissingCompanyFilters(missingFilters), true);
assert.deepEqual(getActiveMissingCompanyFilterLabels(missingFilters), [
  "Chybí web",
  "Chybí kontakt",
]);
assert.deepEqual(
  buildCompaniesQueryParams({
    limit: 50,
    afterId: 987,
    filters: buildCompaniesListFilterState("  acme  ", missingFilters),
  }),
  {
    limit: 50,
    afterId: 987,
    q: "acme",
    missingWeb: true,
    missingLogo: undefined,
    missingContact: true,
  },
);
