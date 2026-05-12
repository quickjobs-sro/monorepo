import { expect, test, type Locator } from "@playwright/test";

const VISIT_REQUEST = /\/v1\/jobs\/\d+\/visits$/;

function getJobIdFromPath(pathname: string): string {
    const match = /^\/jobs\/detail\/(\d+)\/?$/.exec(pathname);
    const jobId = match?.[1];
    if (!jobId) {
        throw new Error(`Expected job detail pathname, got ${pathname}`);
    }
    return jobId;
}

async function getDetailPathFromLocator(locator: Locator): Promise<string> {
    const href = await locator.getAttribute("href");
    if (!href) {
        throw new Error("Expected job detail link to have href");
    }
    return new URL(href, "http://localhost:3002").pathname;
}

test.describe("Job visit tracker", () => {
    test("records visits for real job detail navigations, including browser back", async ({ page }) => {
        const visitPaths: string[] = [];

        await page.route(VISIT_REQUEST, async (route) => {
            visitPaths.push(new URL(route.request().url()).pathname);
            await route.fulfill({
                status: 204,
                headers: {
                    "access-control-allow-origin": "*",
                },
                body: "",
            });
        });

        await page.goto("/jobs", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });

        const detailLinks = page.locator('a[href^="/jobs/detail/"]');
        await expect(detailLinks.first()).toBeVisible({ timeout: 15_000 });
        await page.waitForTimeout(1_000);
        expect(visitPaths).toEqual([]);

        const firstPath = await getDetailPathFromLocator(detailLinks.first());
        const firstJobId = getJobIdFromPath(firstPath);

        await detailLinks.first().click();
        await expect(page).toHaveURL(new RegExp(`${firstPath.replace(/\//g, "\\/")}(?:\\?.*)?$`));
        await expect.poll(() => visitPaths).toEqual([`/v1/jobs/${firstJobId}/visits`]);

        const nextPath = await page.locator('a[href^="/jobs/detail/"]').evaluateAll((links, currentPath) => {
            const paths = links
                .map((link) => new URL(link.getAttribute("href") || "", window.location.origin).pathname)
                .filter((pathname) => pathname !== currentPath);
            return paths[0] || null;
        }, firstPath);

        if (nextPath == null) {
            test.skip(true, "Need at least two detail links to verify detail-to-detail navigation");
            return;
        }

        const nextJobId = getJobIdFromPath(nextPath);
        await page.locator(`a[href^="${nextPath}"]`).first().click();
        await expect(page).toHaveURL(new RegExp(`${nextPath.replace(/\//g, "\\/")}(?:\\?.*)?$`));
        await expect.poll(() => visitPaths).toEqual([
            `/v1/jobs/${firstJobId}/visits`,
            `/v1/jobs/${nextJobId}/visits`,
        ]);

        await page.goBack({ waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(new RegExp(`${firstPath.replace(/\//g, "\\/")}(?:\\?.*)?$`));
        await expect.poll(() => visitPaths).toEqual([
            `/v1/jobs/${firstJobId}/visits`,
            `/v1/jobs/${nextJobId}/visits`,
            `/v1/jobs/${firstJobId}/visits`,
        ]);
    });
});
