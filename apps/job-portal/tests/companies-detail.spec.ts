import { test, expect } from "@playwright/test";

test.describe("Company detail page", () => {
    test("navigates from listing tile to detail page", async ({ page }) => {
        await page.goto("/companies");

        // Wait for at least one company tile link
        const firstTile = page.locator("a[href^='/companies/']").first();
        await expect(firstTile).toBeVisible({ timeout: 30_000 });

        // Href must be /companies/{id}-{slug} format
        const href = await firstTile.getAttribute("href");
        expect(href).toMatch(/^\/companies\/\d+-[a-z0-9-]+$/);

        await firstTile.click();
        await expect(page).toHaveURL(/\/companies\/\d+-[a-z0-9-]+/);
    });

    test("detail page has back link and job section headings", async ({ page }) => {
        await page.goto("/companies");
        const firstTile = page.locator("a[href^='/companies/']").first();
        await firstTile.waitFor({ timeout: 30_000 });
        await firstTile.click();

        await expect(page.getByText("Zpět na firmy")).toBeVisible();
        await expect(page.getByText("Aktivní 1-click nabídky")).toBeVisible();
    });

    test("back link returns to /companies listing", async ({ page }) => {
        await page.goto("/companies");
        const firstTile = page.locator("a[href^='/companies/']").first();
        await firstTile.waitFor({ timeout: 30_000 });
        await firstTile.click();
        await page.getByText("Zpět na firmy").click();
        await expect(page).toHaveURL("/companies");
    });

    test("returns 404 for slug without numeric ID prefix", async ({ page }) => {
        const response = await page.goto("/companies/not-a-number-slug");
        expect(response?.status()).toBe(404);
    });

    test("returns 404 for valid slug format but non-existent company ID", async ({ page }) => {
        // ID 99999999 is extremely unlikely to exist
        const response = await page.goto("/companies/99999999-nonexistent-company");
        expect(response?.status()).toBe(404);
    });

    test("listing page no longer shows contact modal buttons inline", async ({ page }) => {
        await page.goto("/companies");
        await page.locator("a[href^='/companies/']").first().waitFor({ timeout: 30_000 });
        await expect(page.getByText("Kontakt na HR pro studenty")).not.toBeVisible();
    });

    test("detail page title contains company name and suffix", async ({ page }) => {
        await page.goto("/companies");
        const firstTile = page.locator("a[href^='/companies/']").first();
        await firstTile.waitFor({ timeout: 30_000 });

        // Grab the company name from the heading visible on listing
        const companyName = await firstTile.locator("h2").first().innerText();

        await firstTile.click();
        const title = await page.title();

        // Title must contain both the company name AND the static suffix
        expect(title).toContain("Detail firmy | QuickJOBS.cz");
        if (companyName.trim()) {
            expect(title).toContain(companyName.trim());
        }
    });
});
