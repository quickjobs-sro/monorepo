import { test, expect } from "@playwright/test";

const BACKEND_PROFILE_RE = /backend\.quickjobs\.cz.*\/me\/profile/;
const LEGACY_PROFILE_RE = /api\.quickjobs\.cz.*\/me\/profile/;

const HIDDEN_PROFILE = {
    data: {
        id: 1,
        given_name: "Petr",
        family_name: "Testovaci",
        email: "test@quickjobs.cz",
        phone: "+420123456789",
        gender: null,
        birth_date: null,
        age: null,
        company_name: null,
        description: "Testovaci popis",
        roles: [],
        skills: [],
        experience: [],
        rating: 0,
        rating_count: 0,
        enabled: true,
        hide_profile: 1,
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

// Fake JWT with exp year 2286 so isValidToken passes
const FAKE_ACCESS_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjo5OTk5OTk5OTk5fQ.ZmFrZQ";

test.describe("Profile edit: hide_profile is preserved when saving form fields", () => {
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
            // Legacy cookie so useTokenRestore resolves
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

    test("PATCH body does not contain hide_profile and toggle stays hidden after save", async ({
        page,
    }) => {
        let patchBody: Record<string, unknown> | null = null;

        // Mock GET /me/profile — return profile with hide_profile: 1 (hidden)
        await page.route(BACKEND_PROFILE_RE, async (route) => {
            if (route.request().method() === "GET") {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(HIDDEN_PROFILE),
                });
            } else {
                await route.continue();
            }
        });

        // Mock PATCH /me/profile — capture body, return same profile
        await page.route(LEGACY_PROFILE_RE, async (route) => {
            if (route.request().method() === "PATCH") {
                patchBody = JSON.parse(route.request().postData() ?? "{}");
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(HIDDEN_PROFILE),
                });
            } else {
                await route.continue();
            }
        });

        await page.goto("/profile/edit");

        // Profile should load showing hidden state
        await expect(page.getByText("Tvůj účet je skrytý")).toBeVisible({ timeout: 15_000 });

        // Edit first name to make the form dirty
        const firstNameInput = page.getByLabel(/Jméno/i).first();
        await firstNameInput.clear();
        await firstNameInput.fill("NoveJmeno");
        await firstNameInput.blur();

        // Save button should be enabled now
        const saveButton = page.getByRole("button", { name: /Uložit/i });
        await expect(saveButton).toBeEnabled({ timeout: 5_000 });
        await saveButton.click();

        // Wait for PATCH to be captured
        await expect.poll(() => patchBody, { timeout: 10_000 }).not.toBeNull();

        // ✅ Fix verification: hide_profile must NOT be in the PATCH payload
        expect(patchBody, "PATCH body should not contain hide_profile").not.toHaveProperty(
            "hide_profile"
        );

        // ✅ UI verification: toggle should still show hidden state after save
        await expect(page.getByText("Tvůj účet je skrytý")).toBeVisible({ timeout: 5_000 });
    });
});
