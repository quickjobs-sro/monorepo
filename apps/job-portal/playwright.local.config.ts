import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: false,
    retries: 0,
    reporter: "list",
    use: {
        baseURL: "http://localhost:3099",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    // No webServer — assumes the dev server is already running on 3099
});
