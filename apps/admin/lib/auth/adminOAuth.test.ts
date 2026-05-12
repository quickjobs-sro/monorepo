const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  createAdminOAuthBasicAuthorizationHeader,
  getAdminOAuthBasicAuthorizationHeader,
} = require("./adminOAuth");

const repoRoot = path.resolve(__dirname, "../../../..");
const turboConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, "turbo.json"), "utf8"));
const startRuntimeEnv = [
  ...(turboConfig.globalEnv ?? []),
  ...(turboConfig.globalPassThroughEnv ?? []),
  ...(turboConfig.tasks?.start?.env ?? []),
  ...(turboConfig.tasks?.start?.passThroughEnv ?? []),
];

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

assert.ok(
  startRuntimeEnv.includes("ADMIN_OAUTH_CLIENT_KEY"),
  "Turbo start must pass ADMIN_OAUTH_CLIENT_KEY through to the admin Next.js runtime."
);

assert.ok(
  startRuntimeEnv.includes("ADMIN_OAUTH_CLIENT_SECRET"),
  "Turbo start must pass ADMIN_OAUTH_CLIENT_SECRET through to the admin Next.js runtime."
);
