const assert = require("node:assert/strict");
const {
  createAdminOAuthBasicAuthorizationHeader,
  getAdminOAuthBasicAuthorizationHeader,
} = require("./adminOAuth");

assert.equal(
  createAdminOAuthBasicAuthorizationHeader({
    username: "admin-client",
    password: "secret-value",
  }),
  `Basic ${Buffer.from("admin-client:secret-value", "utf8").toString("base64")}`
);

assert.equal(
  getAdminOAuthBasicAuthorizationHeader({
    ADMIN_OAUTH_CLIENT_KEY: " key-from-env ",
    ADMIN_OAUTH_CLIENT_SECRET: " secret-from-env ",
  }),
  `Basic ${Buffer.from("key-from-env:secret-from-env", "utf8").toString("base64")}`
);

assert.throws(
  () =>
    getAdminOAuthBasicAuthorizationHeader({
      ADMIN_OAUTH_CLIENT_KEY: "key-from-env",
    }),
  /Admin OAuth client credentials are not configured/
);
