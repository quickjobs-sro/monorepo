import { expect, test } from "@playwright/test";

function resolveRedirectLocation(location: string, requestUrl: string) {
    return new URL(location, requestUrl);
}

test.describe("Legacy job detail redirect", () => {
    test("redirects old numeric detail URL with 301", async ({ request }) => {
        const response = await request.get("/detail/14054", { maxRedirects: 0 });
        const location = response.headers().location;

        expect(response.status()).toBe(301);
        expect(location).toBeDefined();
        expect(resolveRedirectLocation(location!, response.url()).pathname).toBe("/jobs/detail/14054");
    });

    test("preserves query string when redirecting old detail URL", async ({ request }) => {
        const response = await request.get("/detail/14054?utm_source=test", { maxRedirects: 0 });
        const location = response.headers().location;

        expect(response.status()).toBe(301);
        expect(location).toBeDefined();

        const redirectUrl = resolveRedirectLocation(location!, response.url());
        expect(redirectUrl.pathname).toBe("/jobs/detail/14054");
        expect(redirectUrl.searchParams.get("utm_source")).toBe("test");
    });
});
