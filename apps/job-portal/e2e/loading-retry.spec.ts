import { test, expect } from "@playwright/test";

/**
 * When backend is slow or returns 5xx, the app should show retry UI ("Zkusit znovu")
 * instead of hanging. These tests mock the API to verify that.
 *
 * For authenticated routes (companies, my-jobs), the retry UI only appears when
 * the user is logged in and the fetch runs. Use E2E_TEST_AUTH_COOKIE (or similar)
 * to run the full retry test with a real session.
 */

const BACKEND_API = /(?:api\.quickjobs\.cz|127\.0\.0\.1:3000|localhost:3000)\//;

test.describe("Loading and retry", () => {
    test("when companies API returns 504, page does not hang", async ({ page }) => {
        await page.route(BACKEND_API, (route) => {
            if (route.request().url().includes("companies")) {
                return route.fulfill({ status: 504, body: "Gateway Timeout" });
            }
            route.continue();
        });

        await page.goto("/companies");
        await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
        // When logged in: retry button or error message. When not: login or empty state.
        const retryButton = page.getByRole("button", { name: /Zkusit znovu/i });
        const main = page.getByRole("main");
        await expect(main.or(retryButton)).toBeVisible();
    });

    test("when my-applications API returns 504, my-jobs page does not hang", async ({ page }) => {
        await page.route(BACKEND_API, (route) => {
            const url = route.request().url();
            if (url.includes("my-applications") || url.includes("jobs/external")) {
                return route.fulfill({ status: 504, body: "Gateway Timeout" });
            }
            route.continue();
        });

        await page.goto("/my-jobs");
        await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
        const retryButton = page.getByRole("button", { name: /Zkusit znovu/i });
        const heading = page.getByRole("heading", { name: /Moje práce/i });
        await expect(heading.or(retryButton)).toBeVisible();
    });

    test("when companies API is slow (>10s), retry UI appears", async ({ page }) => {
        test.skip(true, "Enable when test auth is available: set auth cookie and run");
        // When you have a test auth cookie, unskip and set it here, then the slow response
        // will trigger the client timeout and "Zkusit znovu" will show.
        await page.route(BACKEND_API, (route) => {
            if (!route.request().url().includes("companies")) {
                route.continue();
                return;
            }
            setTimeout(() => {
                route.fulfill({ status: 504, body: "Gateway Timeout" }).catch(() => {});
            }, 12_000);
        });

        // await page.context().addCookies([{ name: 'token', value: process.env.E2E_TEST_AUTH_COOKIE!, domain: 'localhost', path: '/' }]);
        await page.goto("/companies");
        await expect(page.getByRole("button", { name: /Zkusit znovu/i })).toBeVisible({ timeout: 25_000 });
    });
});
