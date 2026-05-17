import { test, expect } from "@playwright/test";

// Fake JWT with exp year 2286 so isValidToken passes
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

/** Finds the first job detail page that renders an ExternalApplyButton (URL-based external job).
 *  Returns the jobId string, or null if none found among the first N links. */
async function findUrlExternalJobId(page: ReturnType<typeof test["info"]> extends never ? never : any, limit = 6): Promise<string | null> {
    await page.goto("/jobs");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });

    const links = page.locator('a[href^="/jobs/detail/"]');
    await expect(links.first()).toBeVisible({ timeout: 15_000 });

    const hrefs: string[] = await links.evaluateAll((els: HTMLAnchorElement[]) =>
        els.slice(0, 6).map((el) => el.getAttribute("href") ?? "").filter(Boolean)
    );

    for (const href of hrefs.slice(0, limit)) {
        const jobId = href.match(/\/jobs\/detail\/(\d+)/)?.[1];
        if (!jobId) continue;

        // Pre-populate localStorage as if this job was already applied via ExternalApplyButton
        await page.evaluate((id: number) => {
            localStorage.setItem("appliedExternalJobs", JSON.stringify([id]));
        }, Number(jobId));

        await page.goto(`/jobs/detail/${jobId}`);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

        // "↗ OTEVŘÍT ZNOVU" only appears in ExternalApplyButton for URL-based external jobs
        const reopenBtn = page.getByRole("button", { name: /OTEVŘÍT ZNOVU/i });
        const isUrlExternal = await reopenBtn.isVisible({ timeout: 2_000 }).catch(() => false);

        // Clean up localStorage between attempts regardless of outcome
        await page.evaluate(() => {
            localStorage.removeItem("appliedExternalJobs");
            localStorage.removeItem("ignoredExternalJobs");
        });

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
            {
                name: "QuickJobs.tokens",
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
        }).catch(() => {});
    });

    test.beforeEach(async ({ page }) => {
        // Mock profile so token restore + profile fetch succeed
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
        // Stub token restore so it doesn't 401
        await page.route(/\/oauth\/token/, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ access_token: FAKE_ACCESS_TOKEN, token_type: "Bearer" }),
            });
        });
    });

    test("URL external job: OTEVŘÍT ZNOVU appears on revisit from localStorage, backend not called again", async ({ page }) => {
        const jobId = await findUrlExternalJobId(page);
        if (!jobId) {
            test.skip(true, "No URL-based external jobs found in the first 6 job links");
            return;
        }

        const applyCallCount = { n: 0 };
        await page.route(/external.*application|application.*external/i, async (route) => {
            applyCallCount.n++;
            await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) });
        });

        // Simulate returning to the job after having previously applied
        await page.evaluate((id: number) => {
            localStorage.setItem("appliedExternalJobs", JSON.stringify([id]));
        }, Number(jobId));

        await page.goto(`/jobs/detail/${jobId}`);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

        // "↗ OTEVŘÍT ZNOVU" must be visible
        const reopenBtn = page.getByRole("button", { name: /OTEVŘÍT ZNOVU/i });
        await expect(reopenBtn).toBeVisible({ timeout: 5_000 });

        // "NEMÁM ZÁJEM" must be gone
        await expect(page.getByRole("button", { name: /NEMÁM ZÁJEM/i })).not.toBeVisible();

        // Clicking OTEVŘÍT ZNOVU must NOT call the backend
        const [newTab] = await Promise.all([
            page.context().waitForEvent("page").catch(() => null),
            reopenBtn.click(),
        ]);

        await page.waitForTimeout(1_000); // give any potential request time to fire
        expect(applyCallCount.n).toBe(0);

        // localStorage still contains the jobId
        const stored = await page.evaluate(() =>
            JSON.parse(localStorage.getItem("appliedExternalJobs") ?? "[]")
        );
        expect(stored).toContain(Number(jobId));

        if (newTab) await newTab.close();
    });

    test("URL external job: backend apply called exactly once, NEMÁM ZÁJEM disappears after apply", async ({ page }) => {
        const jobId = await findUrlExternalJobId(page);
        if (!jobId) {
            test.skip(true, "No URL-based external jobs found in the first 6 job links");
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
        await expect(page.getByRole("button", { name: /MÁM ZÁJEM/i })).toBeVisible();

        // Click MÁM ZÁJEM → confirmation dialog
        await page.getByRole("button", { name: /MÁM ZÁJEM/i }).click();
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
            test.skip(true, "No URL-based external jobs found in the first 6 job links");
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

        // Revisit: NEMÁM ZÁJEM must be gone, MÁM ZÁJEM still there
        await page.evaluate((id: number) => {
            // Ensure we're in ignored state (in case redirect happened)
            localStorage.setItem("ignoredExternalJobs", JSON.stringify([id]));
        }, Number(jobId));

        await page.goto(`/jobs/detail/${jobId}`);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

        await expect(page.getByRole("button", { name: /NEMÁM ZÁJEM/i })).not.toBeVisible({ timeout: 3_000 });
        await expect(page.getByRole("button", { name: /MÁM ZÁJEM/i })).toBeVisible();
    });
});
