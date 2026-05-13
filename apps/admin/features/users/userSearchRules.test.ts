const assert = require("node:assert/strict");
const {
  buildUserSearchQueryParams,
  canSearchUsers,
  normalizeUserSearchTerm,
  shouldEnableUserSearch,
  USER_SEARCH_DEBOUNCE_MS,
  USER_SEARCH_LIMIT,
} = require("./userSearchRules");

assert.equal(normalizeUserSearchTerm("  Jan   Novak  "), "Jan Novak");
assert.equal(normalizeUserSearchTerm("  ab "), "ab");

assert.equal(canSearchUsers("ab"), false);
assert.equal(canSearchUsers(" abc "), true);
assert.equal(canSearchUsers("  Jan   Novak  "), true);

assert.equal(USER_SEARCH_DEBOUNCE_MS, 300);
assert.equal(USER_SEARCH_LIMIT, 20);
assert.deepEqual(buildUserSearchQueryParams("  Jan   Novak  "), {
  limit: 20,
  q: "Jan Novak",
  deleted: false,
});

assert.equal(shouldEnableUserSearch(false, "Jan"), false);
assert.equal(shouldEnableUserSearch(true, "ab"), false);
assert.equal(shouldEnableUserSearch(true, "Jan"), true);
