import { test, expect } from "@playwright/test";

// Fake JWT with exp year 2286 so isValidToken passes and token is not considered expired
const FAKE_ACCESS_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjo5OTk5OTk5OTk5fQ.ZmFrZQ";

const MOCK_PROFILE = {
    data: {
        id: 1,
        given_name: "Test",
        family_name: "User",
        email: "test@quickjobs.cz",
        phone: "+420123456789",
        gender: null,
        birth_date: null,
        age: null,
        company_name: null,
        description: "Experienced developer",
        roles: [],
        skills: ["JavaScript"],
        experience: ["Developer 2 years"],
        rating: 0,
        rating_count: 0,
        enabled: true,
        hide_profile: 0,
        deleted_reason: null,
        user_source: null,
        platform: "web",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
        deleted_at: null,
        send_notification: true,
        subscribed_notifications: {},
        hasCandidateAccess: true,
        areas: [],
        userSchools: [],
        avatar_image: null,
        body_image: null,
        face_image: null,
        optional_image: null,
        reviews: [],
    },
};

/** Minimal applied/ignored response shape — only `id` is needed by the component */
const emptyReactions = () => JSON.stringify({ jobs: [] });
const appliedReactions = (id: number) => JSON.stringify({ jobs: [{ id }] });
const ignoredReactions = (id: number) => JSON.stringify({ jobs: [{ id }] });

/** Finds a URL-based external job ID by temporarily mocking the backend applied list for each
 *  candidate and checking whether OTEVŘÍT ZNOVU renders on the job detail page. */
async function findUrlExternalJobId(page: any): Promise<string | null> {
    // Known external job IDs — checked in order; first one that renders OTEVŘÍT ZNOVU is used.
    const candidates = [21425, 21424, 21421, 21420, 21416, 21415, 21414, 21413, 21402];

    // Navigate first so token restore completes before we probe detail pages
    await page.goto("/jobs");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3_000);

    for (const id of candidates) {
        const jobId = String(id);

        // Temporarily tell the component this job is in the applied list
        const appliedHandler = async (route: any) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: appliedReactions(id),
            });
        };
        await page.route(/backend\.quickjobs\.cz\/v2\/jobs\/external-applied/, appliedHandler);

        await page.goto(`/jobs/detail/${jobId}`);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 12_000 });

        const reopenBtn = page.getByRole("button", { name: /OTEVŘÍT ZNOVU/i });
        const isUrlExternal = await reopenBtn.isVisible({ timeout: 9_000 }).catch(() => false);

        // Restore the default empty-list handler for the next iteration
        await page.unroute(/backend\.quickjobs\.cz\/v2\/jobs\/external-applied/, appliedHandler);

        if (isUrlExternal) return jobId;
    }

    return null;
}

test.describe("ExternalApplyButton", () => {
    test.beforeEach(async ({ context }) => {
        await context.addCookies([
            {
                name: "QuickJobsPortal.tokens",
                value: JSON.stringify({
                    accessToken: FAKE_ACCESS_TOKEN,
                    refreshToken: "fake-refresh-token",
                    tokenType: "Bearer",
                }),
                domain: "localhost",
                path: "/",
                httpOnly: false,
                secure: false,
                sameSite: "Lax",
            },
        ]);
    });

    test.afterEach(async ({ page }) => {
        await page.evaluate(() => {
            localStorage.removeItem("appliedExternalJobs");
            localStorage.removeItem("ignoredExternalJobs");
            localStorage.removeItem("quickjobs_pending_job_action");
        }).catch(() => {});
    });

    test.beforeEach(async ({ page }) => {
        // Mock profile so the fake token appears as a real logged-in session
        await page.route(/\/me\/profile/, async (route) => {
            if (route.request().method() === "GET") {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(MOCK_PROFILE),
                });
            } else {
                await route.continue();
            }
        });
        // Stub token restore endpoints so they complete instantly (avoids 10s timeout)
        await page.route(/\/oauth\/token/, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ access_token: FAKE_ACCESS_TOKEN, token_type: "Bearer" }),
            });
        });
        // Stub legacy API calls (syncLegacyToken → quickjobs-api-wrapper → api.quickjobs.cz)
        await page.route(/api\.quickjobs\.cz/, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ data: { accessToken: FAKE_ACCESS_TOKEN } }),
            });
        });
        // Default: backend reports no applied or ignored jobs for this test user
        await page.route(/backend\.quickjobs\.cz\/v2\/jobs\/external-applied/, async (route) => {
            await route.fulfill({ status: 200, contentType: "application/json", body: emptyReactions() });
        });
        await page.route(/backend\.quickjobs\.cz\/v2\/jobs\/external-ignored/, async (route) => {
            await route.fulfill({ status: 200, contentType: "application/json", body: emptyReactions() });
        });
    });

    test("URL external job: OTEVŘÍT ZNOVU appears when backend lists job as applied, clicking it does not call apply API", async ({ page }) => {
        const jobId = await findUrlExternalJobId(page);
        if (!jobId) {
            test.skip(true, "No URL-based external jobs found via public API");
            return;
        }

        const applyCallCount = { n: 0 };
        await page.route(/external.*application|application.*external/i, async (route) => {
            applyCallCount.n++;
            await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) });
        });

        // Override applied list to include this job
        const appliedHandler = async (route: any) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: appliedReactions(Number(jobId)),
            });
        };
        await page.route(/backend\.quickjobs\.cz\/v2\/jobs\/external-applied/, appliedHandler);

        await page.goto(`/jobs/detail/${jobId}`);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

        // OTEVŘÍT ZNOVU must be visible
        const reopenBtn = page.getByRole("button", { name: /OTEVŘÍT ZNOVU/i });
        await expect(reopenBtn).toBeVisible({ timeout: 5_000 });

        // NEMÁM ZÁJEM must be gone
        await expect(page.getByRole("button", { name: /NEMÁM ZÁJEM/i })).not.toBeVisible();

        // Clicking OTEVŘÍT ZNOVU must NOT call the backend apply endpoint
        const [newTab] = await Promise.all([
            page.context().waitForEvent("page").catch(() => null),
            reopenBtn.click(),
        ]);

        await page.waitForTimeout(1_000);
        expect(applyCallCount.n).toBe(0);

        if (newTab) await newTab.close();
    });

    test("URL external job: backend apply called exactly once, NEMÁM ZÁJEM disappears after apply", async ({ page }) => {
        const jobId = await findUrlExternalJobId(page);
        if (!jobId) {
            test.skip(true, "No URL-based external jobs found via public API");
            return;
        }

        const applyCallCount = { n: 0 };
        await page.route(/external.*application|application.*external/i, async (route) => {
            const body = route.request().postData() ?? "";
            if (body.includes("apply")) {
                applyCallCount.n++;
                await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) });
            } else {
                await route.continue();
            }
        });

        await page.goto(`/jobs/detail/${jobId}`);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

        // Fresh state: both buttons visible
        await expect(page.getByRole("button", { name: /NEMÁM ZÁJEM/i })).toBeVisible({ timeout: 5_000 });
        await expect(page.getByRole("button", { name: /^MÁM ZÁJEM$/i })).toBeVisible();

        // Click MÁM ZÁJEM → confirmation dialog
        await page.getByRole("button", { name: /^MÁM ZÁJEM$/i }).click();
        const confirmBtn = page.getByRole("button", { name: /ANO.*MÁM ZÁJEM/i });
        await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
        await confirmBtn.click();

        // jobId should be saved to localStorage
        await expect.poll(
            () => page.evaluate(() => JSON.parse(localStorage.getItem("appliedExternalJobs") ?? "[]")),
            { timeout: 8_000 }
        ).toContain(Number(jobId));

        // Exactly one apply call
        expect(applyCallCount.n).toBe(1);
    });

    test("NEMÁM ZÁJEM: backend ignore called exactly once, button gone on revisit", async ({ page }) => {
        const jobId = await findUrlExternalJobId(page);
        if (!jobId) {
            test.skip(true, "No URL-based external jobs found via public API");
            return;
        }

        const ignoreCallCount = { n: 0 };
        await page.route(/external.*application|application.*external/i, async (route) => {
            const body = route.request().postData() ?? "";
            if (body.includes("ignore")) {
                ignoreCallCount.n++;
                await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) });
            } else {
                await route.continue();
            }
        });

        await page.goto(`/jobs/detail/${jobId}`);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole("button", { name: /NEMÁM ZÁJEM/i })).toBeVisible({ timeout: 5_000 });

        await page.getByRole("button", { name: /NEMÁM ZÁJEM/i }).click();

        // localStorage ignoredExternalJobs should contain this jobId
        await expect.poll(
            () => page.evaluate(() => JSON.parse(localStorage.getItem("ignoredExternalJobs") ?? "[]")),
            { timeout: 8_000 }
        ).toContain(Number(jobId));

        expect(ignoreCallCount.n).toBe(1);

        // Revisit: mock backend to return job as ignored, then check NEMÁM ZÁJEM is gone
        const ignoredHandler = async (route: any) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: ignoredReactions(Number(jobId)),
            });
        };
        await page.route(/backend\.quickjobs\.cz\/v2\/jobs\/external-ignored/, ignoredHandler);

        await page.goto(`/jobs/detail/${jobId}`);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

        await expect(page.getByRole("button", { name: /NEMÁM ZÁJEM/i })).not.toBeVisible({ timeout: 3_000 });
        await expect(page.getByRole("button", { name: /^MÁM ZÁJEM$/i })).toBeVisible();
    });

    test("not logged in: clicking MÁM ZÁJEM saves external_apply pending action and redirects to login", async ({ page, context }) => {
        const jobId = await findUrlExternalJobId(page);
        if (!jobId) {
            test.skip(true, "No URL-based external jobs found via public API");
            return;
        }

        // Remove auth cookie to simulate unauthenticated state
        await context.clearCookies();

        await page.goto(`/jobs/detail/${jobId}`);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

        // Only MÁM ZÁJEM should appear — NEMÁM ZÁJEM requires login
        const mamZajemBtn = page.getByRole("button", { name: /^MÁM ZÁJEM$/i });
        await expect(mamZajemBtn).toBeVisible({ timeout: 8_000 });
        await expect(page.getByRole("button", { name: /NEMÁM ZÁJEM/i })).not.toBeVisible();

        await mamZajemBtn.click();

        // Should redirect to /login
        await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });

        // Pending action must be saved with the correct shape
        const pending = await page.evaluate(() =>
            JSON.parse(localStorage.getItem("quickjobs_pending_job_action") ?? "null")
        );
        expect(pending).not.toBeNull();
        expect(pending.jobId).toBe(Number(jobId));
        expect(pending.action).toBe("external_apply");
        expect(pending.url).toBeTruthy();
    });
});
