import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fetchPublicJobById, recordJobVisit } from "../lib/api";

type FetchCall = {
    input: Parameters<typeof fetch>[0];
    init?: NonNullable<Parameters<typeof fetch>[1]> & {
        next?: {
            revalidate?: number | false;
            tags?: string[];
        };
    };
};

const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.API_URL;
const originalNextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;

afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.API_URL = originalApiUrl;
    process.env.NEXT_PUBLIC_API_URL = originalNextPublicApiUrl;
});

function mockFetch(response: Response): FetchCall[] {
    const calls: FetchCall[] = [];
    globalThis.fetch = (async (input, init) => {
        calls.push({ input, init: init as FetchCall["init"] });
        return response;
    }) as typeof fetch;
    return calls;
}

test("fetchPublicJobById sends skip-visit header while preserving ISR options", async () => {
    process.env.API_URL = "https://backend.test/";
    const calls = mockFetch(new Response(JSON.stringify({
        data: { id: 123 },
        stats: { job_id: 123, applied_total: 0, updated_at: "2026-05-06T00:00:00.000Z", jobVisits: 0 },
    }), { status: 200 }));

    await fetchPublicJobById(123);

    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.ok(call);
    const headers = new Headers(call.init?.headers);
    assert.equal(headers.get("X-QJ-Skip-Visit"), "1");
    assert.deepEqual(call.init?.next, {
        revalidate: 300,
        tags: ["job-detail", "job-123"],
    });
});

test("recordJobVisit posts to the v1 visits endpoint without storing the response", async () => {
    process.env.API_URL = "https://backend.test/";
    const calls = mockFetch(new Response(null, { status: 204 }));

    await recordJobVisit(456);

    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.ok(call);
    assert.equal(String(call.input), "https://backend.test/v1/jobs/456/visits");
    assert.equal(call.init?.method, "POST");
    assert.equal(call.init?.cache, "no-store");
    assert.equal(call.init?.keepalive, true);
});
