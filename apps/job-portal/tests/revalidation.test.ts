import assert from "node:assert/strict";
import { test } from "node:test";
import {
    isValidRevalidateSecret,
    resolveRevalidationEvent,
} from "../lib/revalidation";
import { handleRevalidationPost } from "../lib/revalidationRoute";
import { POST } from "../app/api/revalidate/route";

test("resolves company create with slug and old slug", () => {
    const result = resolveRevalidationEvent({
        entity: "company",
        action: "created",
        id: 123,
        slug: "firma-slug",
        oldSlug: "stary-slug",
    });

    assert.deepEqual(result.tags, ["companies-list", "company-123"]);
    assert.deepEqual(result.paths, [
        "/companies",
        "/companies/firma-slug",
        "/companies/stary-slug",
    ]);
    assert.deepEqual(result.warnings, []);
});

test("resolves company update without old slug", () => {
    const result = resolveRevalidationEvent({
        entity: "company",
        action: "updated",
        id: 123,
        slug: "firma-slug",
    });

    assert.deepEqual(result.tags, ["companies-list", "company-123"]);
    assert.deepEqual(result.paths, ["/companies", "/companies/firma-slug"]);
    assert.deepEqual(result.warnings, []);
});

test("resolves job publish with id and company slug", () => {
    const result = resolveRevalidationEvent({
        entity: "job",
        action: "published",
        id: 14413,
        companyId: 123,
        companySlug: "firma-slug",
    });

    assert.deepEqual(result.tags, ["jobs-list", "job-14413", "company-123"]);
    assert.deepEqual(result.paths, [
        "/jobs",
        "/jobs/detail/14413",
        "/companies/firma-slug",
    ]);
    assert.deepEqual(result.warnings, []);
});

test("resolves job company transfer with old company slug", () => {
    const result = resolveRevalidationEvent({
        entity: "job",
        action: "updated",
        id: 14413,
        companyId: 123,
        companySlug: "nova-firma",
        oldCompanyId: 456,
        oldCompanySlug: "puvodni-firma",
    });

    assert.deepEqual(result.tags, ["jobs-list", "job-14413", "company-123", "company-456"]);
    assert.deepEqual(result.paths, [
        "/jobs",
        "/jobs/detail/14413",
        "/companies/nova-firma",
        "/companies/puvodni-firma",
    ]);
    assert.deepEqual(result.warnings, []);
});

test("resolves company-user connect with company slug", () => {
    const result = resolveRevalidationEvent({
        entity: "company-user",
        action: "connected",
        companyId: 123,
        companySlug: "firma-slug",
    });

    assert.deepEqual(result.tags, ["company-123"]);
    assert.deepEqual(result.paths, ["/companies/firma-slug"]);
    assert.deepEqual(result.warnings, []);
});

test("resolver never returns the broad companies tag", () => {
    const payloads = [
        { entity: "company", action: "updated", id: 123, slug: "firma-slug" },
        { entity: "job", action: "published", id: 14413, companyId: 123, companySlug: "firma-slug" },
        {
            entity: "job",
            action: "updated",
            id: 14413,
            companyId: 123,
            companySlug: "nova-firma",
            oldCompanyId: 456,
            oldCompanySlug: "puvodni-firma",
        },
        { entity: "company-user", action: "connected", companyId: 123, companySlug: "firma-slug" },
    ];

    payloads.forEach((payload) => {
        const result = resolveRevalidationEvent(payload);
        assert.equal(result.tags.includes("companies"), false);
    });
});

test("rejects invalid entity and action", () => {
    assert.throws(
        () => resolveRevalidationEvent({ entity: "profile", action: "updated" }),
        /Unsupported revalidation entity/
    );

    assert.throws(
        () => resolveRevalidationEvent({ entity: "company", action: "connected" }),
        /Unsupported company revalidation action/
    );
});

test("rejects missing required job id and company slug", () => {
    assert.throws(
        () => resolveRevalidationEvent({ entity: "job", action: "published" }),
        /job.id is required/
    );

    assert.throws(
        () => resolveRevalidationEvent({ entity: "job", action: "published", id: 14413 }),
        /job.companyId and job.companySlug are required/
    );

    assert.throws(
        () => resolveRevalidationEvent({ entity: "company", action: "created" }),
        /company.id is required/
    );

    assert.throws(
        () => resolveRevalidationEvent({ entity: "company", action: "created", id: 123 }),
        /company.slug is required/
    );
});

test("rejects partial company pair on job events", () => {
    assert.throws(
        () => resolveRevalidationEvent({
            entity: "job",
            action: "published",
            id: 14413,
            companySlug: "firma-slug",
        }),
        /job.companyId is required when job.companySlug is provided/
    );

    assert.throws(
        () => resolveRevalidationEvent({
            entity: "job",
            action: "updated",
            id: 14413,
            companyId: 123,
            companySlug: "firma-slug",
            oldCompanyId: 456,
        }),
        /job.oldCompanySlug is required when job.oldCompanyId is provided/
    );
});

test("rejects missing company-user company id or slug", () => {
    assert.throws(
        () => resolveRevalidationEvent({
            entity: "company-user",
            action: "connected",
            companySlug: "firma-slug",
        }),
        /companyUser.companyId is required/
    );

    assert.throws(
        () => resolveRevalidationEvent({
            entity: "company-user",
            action: "disconnected",
            companyId: 123,
        }),
        /companyUser.companySlug is required/
    );
});

test("validates revalidation secrets without accepting empty configuration", () => {
    assert.equal(isValidRevalidateSecret("secret", "secret"), true);
    assert.equal(isValidRevalidateSecret("wrong", "secret"), false);
    assert.equal(isValidRevalidateSecret("secret", undefined), false);
    assert.equal(isValidRevalidateSecret("", "secret"), false);
});

test("route rejects invalid secret", async () => {
    const originalSecret = process.env.REVALIDATE_SECRET;
    process.env.REVALIDATE_SECRET = "secret";

    try {
        const response = await POST(new Request("http://localhost/api/revalidate", {
            method: "POST",
            headers: { "x-revalidate-secret": "wrong" },
            body: "{}",
        }) as Parameters<typeof POST>[0]);

        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), {
            revalidated: false,
            tags: [],
            paths: [],
            warnings: [],
            error: "Unauthorized",
        });
    } finally {
        process.env.REVALIDATE_SECRET = originalSecret;
    }
});

test("route returns 400 for invalid payload before calling Next revalidation", async () => {
    const originalSecret = process.env.REVALIDATE_SECRET;
    process.env.REVALIDATE_SECRET = "secret";

    try {
        const response = await POST(new Request("http://localhost/api/revalidate", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-revalidate-secret": "secret",
            },
            body: JSON.stringify({ entity: "company", action: "connected" }),
        }) as Parameters<typeof POST>[0]);

        const body = await response.json();
        assert.equal(response.status, 400);
        assert.equal(body.revalidated, false);
        assert.equal(body.error, "Unsupported company revalidation action.");
    } finally {
        process.env.REVALIDATE_SECRET = originalSecret;
    }
});

test("route returns 200 and applies resolved tags and paths", async () => {
    const appliedTags: string[] = [];
    const appliedPaths: string[] = [];

    const response = await handleRevalidationPost(new Request("http://localhost/api/revalidate", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-revalidate-secret": "secret",
        },
        body: JSON.stringify({
            entity: "job",
            action: "published",
            id: 14413,
            companyId: 123,
            companySlug: "firma-slug",
        }),
    }) as Parameters<typeof handleRevalidationPost>[0], {
        configuredSecret: "secret",
        revalidateTag: (tag) => appliedTags.push(tag),
        revalidatePath: (path) => appliedPaths.push(path),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        revalidated: true,
        tags: ["jobs-list", "job-14413", "company-123"],
        paths: ["/jobs", "/jobs/detail/14413", "/companies/firma-slug"],
        warnings: [],
    });
    assert.deepEqual(appliedTags, ["jobs-list", "job-14413", "company-123"]);
    assert.deepEqual(appliedPaths, ["/jobs", "/jobs/detail/14413", "/companies/firma-slug"]);
});
