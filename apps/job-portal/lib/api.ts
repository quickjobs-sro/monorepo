import API from "./legacyApi";
import { reportError } from "./reportError";
import {
    fetchPublicJobDetail,
    fetchPublicJobsList,
} from "./migratedQueries";
import type { JobTerm, PublicJobDetailResponse, PublicJobsResponse } from "./openapi/types";

export { recordJobVisit } from "./jobVisits";

/** Payload for profile update (subset of UpdateProfileInput) */
export type UpdateProfilePayload = {
    subscribedNotifications?: Record<string, string[]>;
    hide_profile?: boolean;
    givenName?: string;
    familyName?: string;
    email?: string;
    description?: string | null;
    birthDate?: string | null;
    skills?: string[];
    experience?: Array<{ title: string; companyName: string }>;
    [key: string]: unknown;
};

const PROFILE_SUBS_THROTTLE_MS = 800;
let lastProfileSubsPatchTime = 0;
let profileSubsInFlight: Promise<{ data?: unknown }> | null = null;
let profileSubsMutex = Promise.resolve();

const PUBLIC_JOBS_TIMEOUT_MS = 25_000;
const DEFAULT_PUBLIC_TERMS: JobTerm[] = ["one_time", "full_time", "long_term"];

function parseJobTerms(term: string): JobTerm[] {
    const parsed = term
        .split(",")
        .map((item) => item.trim())
        .filter((item): item is JobTerm => DEFAULT_PUBLIC_TERMS.includes(item as JobTerm));

    return parsed.length > 0 ? parsed : DEFAULT_PUBLIC_TERMS;
}

function isTimeoutError(err: unknown): boolean {
    const error = err as { cause?: { code?: string }; code?: string; name?: string; message?: string };
    return error?.cause?.code === "ETIMEDOUT"
        || error?.code === "ETIMEDOUT"
        || error?.name === "AbortError"
        || error?.message === "Request timeout";
}

function isNetworkOrSocketError(err: unknown): boolean {
    const error = err as { message?: string; cause?: { code?: string }; code?: string; name?: string };
    const code = error?.cause?.code ?? error?.code;
    if (code === "UND_ERR_SOCKET" || code === "ECONNRESET" || code === "ECONNREFUSED" || code === "ETIMEDOUT") {
        return true;
    }
    if (error?.name === "AbortError") {
        return true;
    }
    return typeof error?.message === "string" && error.message.includes("fetch failed");
}

const publicJobsInFlight = new Map<string, Promise<PublicJobsResponse>>();

function publicJobsCacheKey(lat: number, lng: number, term: string): string {
    return `${lat},${lng},${term}`;
}

/**
 * Update user profile through the remaining legacy mutation boundary.
 */
export async function updateProfileViaApi(payload: UpdateProfilePayload): Promise<{ data?: unknown }> {
    const isSubsOnly =
        payload.subscribedNotifications != null &&
        Object.keys(payload).every((key) => key === "subscribedNotifications");

    const isClient = typeof window !== "undefined";
    if (isSubsOnly && isClient) {
        const promise = await (async () => {
            const previous = profileSubsMutex;
            let release: () => void;
            profileSubsMutex = new Promise<void>((resolve) => {
                release = resolve;
            });
            await previous;
            try {
                await profileSubsInFlight;
                const now = Date.now();
                const elapsed = now - lastProfileSubsPatchTime;
                if (elapsed < PROFILE_SUBS_THROTTLE_MS) {
                    await new Promise((resolve) => setTimeout(resolve, PROFILE_SUBS_THROTTLE_MS - elapsed));
                }
                lastProfileSubsPatchTime = Date.now();
                profileSubsInFlight = doProfilePatch(payload);
                return profileSubsInFlight;
            } finally {
                release!();
            }
        })();

        const owned = profileSubsInFlight;
        try {
            return await promise;
        } finally {
            if (profileSubsInFlight === owned) {
                profileSubsInFlight = null;
            }
        }
    }

    return doProfilePatch(payload);
}

async function doProfilePatch(payload: UpdateProfilePayload): Promise<{ data?: unknown }> {
    try {
        const result = await API.users.updateProfile(payload as Parameters<typeof API.users.updateProfile>[0]);
        return { data: result };
    } catch (error) {
        reportError(error, { location: "api.doProfilePatch" });
        const apiError = error as Error & { response?: { status?: number }; status?: number };
        const status = apiError?.response?.status ?? apiError?.status ?? 500;
        const message = apiError?.message ?? "Request failed";
        const output = new Error(message) as Error & { status?: number };
        output.status = status;
        throw output;
    }
}

export async function fetchPublicJobs(
    lat: number = 50.08513, //50.085130955800935, 14.41904691553407
    lng: number = 14.41904,
    term: string = "one_time,full_time,long_term",
    retry = true
): Promise<PublicJobsResponse> {
    const cacheKey = publicJobsCacheKey(lat, lng, term);
    if (retry) {
        const existing = publicJobsInFlight.get(cacheKey);
        if (existing) {
            return existing;
        }
    }

    const run = async (): Promise<PublicJobsResponse> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PUBLIC_JOBS_TIMEOUT_MS);

        try {
            return await fetchPublicJobsList(
                { lat, lng, term: parseJobTerms(term) },
                {
                    signal: controller.signal,
                    requestInit: {
                        next: {
                            revalidate: 60,
                            tags: ["jobs-list"],
                        },
                    },
                }
            );
        } catch (error) {
            reportError(error, { location: "api.fetchPublicJobs", endpoint: "/jobs/public" });

            const status = (error as { response?: { status?: number }; status?: number })?.response?.status
                ?? (error as { status?: number })?.status;

            if (status === 502 || status === 503 || status === 504) {
                return { jobs: [], stats: [] };
            }

            if (isNetworkOrSocketError(error)) {
                return { jobs: [], stats: [] };
            }

            if (isTimeoutError(error)) {
                throw new Error(`Request timeout: API did not respond within ${PUBLIC_JOBS_TIMEOUT_MS / 1000} seconds`);
            }

            if (error instanceof Error) {
                throw error;
            }

            throw new Error(`Unknown error fetching jobs: ${String(error)}`);
        } finally {
            clearTimeout(timeoutId);
        }
    };

    const promise = (async (): Promise<PublicJobsResponse> => {
        try {
            return await run();
        } catch (error) {
            if (retry && isTimeoutError(error)) {
                return fetchPublicJobs(lat, lng, term, false);
            }

            if (isNetworkOrSocketError(error)) {
                return { jobs: [], stats: [] };
            }

            if (error instanceof Error) {
                throw error;
            }

            throw new Error(`Unknown error fetching jobs: ${String(error)}`);
        }
    })();

    if (retry) {
        publicJobsInFlight.set(cacheKey, promise);
        promise.finally(() => publicJobsInFlight.delete(cacheKey));
    }

    return promise;
}

export async function fetchPublicJobById(id: string | number): Promise<PublicJobDetailResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PUBLIC_JOBS_TIMEOUT_MS);

    try {
        return await fetchPublicJobDetail(id, {
            signal: controller.signal,
            requestInit: {
                headers: {
                    "X-QJ-Skip-Visit": "1",
                },
                next: {
                    revalidate: 3600,
                    tags: ["job-detail", `job-${id}`],
                },
            },
        });
    } catch (error) {
        const status = (error as { status?: number })?.status;
        if (status !== 404) {
            reportError(error, { location: "api.fetchPublicJobById", jobId: String(id) });
        }

        if (isTimeoutError(error)) {
            throw new Error(`Request timeout: API did not respond within ${PUBLIC_JOBS_TIMEOUT_MS / 1000} seconds`);
        }

        if (isNetworkOrSocketError(error)) {
            throw new Error("fetch failed");
        }

        if (error instanceof Error) {
            throw error;
        }

        throw new Error(`Unknown error fetching job: ${String(error)}`);
    } finally {
        clearTimeout(timeoutId);
    }
}
