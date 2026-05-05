import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
    test("homepage loads", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveTitle(/QuickJOBS|Profil|Job Portal/i);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
    });

    test("jobs list page loads", async ({ page }) => {
        await page.goto("/jobs");
        await expect(page).toHaveTitle(/QuickJOBS|Nabídky/i);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole("heading", { name: /Nabídky pro studenty|nabídky/i })).toBeVisible({ timeout: 5_000 });
    });

    test("login page loads", async ({ page }) => {
        await page.goto("/login");
        await expect(page).toHaveTitle(/QuickJOBS/i);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
    });

    test("companies page loads (content or redirect)", async ({ page }) => {
        await page.goto("/companies");
        await expect(page).toHaveURL(/\/(companies|login)/);
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
    });

    test("my-jobs page loads", async ({ page }) => {
        await page.goto("/my-jobs");
        await expect(page).toHaveURL(/\/(my-jobs|login)/);
        await expect(page.getByRole("heading", { name: /Moje práce/i }).or(page.getByRole("main"))).toBeVisible({
            timeout: 10_000,
        });
    });

    test("status page loads", async ({ page }) => {
        await page.goto("/status");
        await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
    });
});
