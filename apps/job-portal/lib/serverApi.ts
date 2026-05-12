import { cookies } from "next/headers";
import { AsyncLocalStorage } from "async_hooks";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { AUTH_TOKEN_COOKIE_NAME } from "./constants";
import { fetchPublicJobs } from "./api";
import { reportError } from "./reportError";
import {
    parseStoredAuthToken,
    resolveStoredAuthToken,
    type StoredAuthToken,
} from "./authSession";
import { fetchAvailableJobs, fetchMyApplications, fetchCompanyDetail as fetchCompanyDetailNew, fetchCompanies } from "./migratedQueries";
import { JOB_TERMS, type JobLike, type CompanyDetailResponse } from "./openapi/types";
import { JobLoadNetworkError, normalizeApiError, is5xx } from "./apiErrors";
import type { Company } from "../types";

export type CompanyDetailData = {
    company: Company;
    activeJobs: CompanyDetailResponse["jobs"];
    inactiveJobs: CompanyDetailResponse["jobs"];
};

const JOBS_LIST_TIMEOUT_MS = 18_000;
const APPLICATION_STATUS_FETCH_TIMEOUT_MS = 25_000;
const APPLICATION_STATUS_CACHE_TTL_MS = 60_000;
const JOBS_LIST_CACHE_TTL_MS = 60_000;

interface AuthContext {
    resolvedToken?: StoredAuthToken | null;
    requestId: string;
    startTime: number;
    authenticatedApiCalls: Array<{
        endpoint: string;
        timestamp: number;
        duration?: number;
        error?: string;
        stack?: string;
    }>;
}

type EmployerStatement = "saved" | "rejected" | "waiting_for_response" | "invited_for_next_round" | "employed";

interface ApplicationStatusCacheEntry {
    value: "applied" | "ignored" | "accepted" | "rejected" | null;
    employerStatement: EmployerStatement | null;
    expiresAt: number;
}

const authAsyncLocal = new AsyncLocalStorage<AuthContext>();
const tokenRestorePromiseByKey = new Map<string, Promise<StoredAuthToken | null>>();
const applicationStatusCache = new Map<string, ApplicationStatusCacheEntry>();
const jobsListCache = new Map<string, { jobs: JobLike[]; expiresAt: number }>();

function tokenToCacheString(token: StoredAuthToken | null | undefined): string {
    return token?.refreshToken ?? token?.accessToken ?? "";
}

function getApplicationStatusCacheKey(token: string, jobId: number): string {
    const tokenPart = token.length >= 32 ? token.substring(0, 32) : token;
    return `${tokenPart}:${jobId}`;
}

function getJobsListCacheKey(token: string, term: string | undefined): string {
    const tokenPart = token.length >= 32 ? token.substring(0, 32) : token;
    return `jobs:${tokenPart}:${term ?? "all"}`;
}

function logAuthenticatedApiCall(endpoint: string, startTime: number, error?: Error) {
    const timestamp = Date.now();
    const duration = timestamp - startTime;
    const store = authAsyncLocal.getStore();

    if (store) {
        store.authenticatedApiCalls.push({
            endpoint,
            timestamp,
            duration,
            error: error?.message,
            stack: error?.stack,
        });
    }
}

export function logAuthenticatedApi(endpoint: string, startTime: number, error?: Error) {
    logAuthenticatedApiCall(endpoint, startTime, error);
}

export function withAuthContext<T>(fn: () => Promise<T>): Promise<T> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    return authAsyncLocal.run({
        resolvedToken: undefined,
        requestId,
        startTime: Date.now(),
        authenticatedApiCalls: [],
    }, fn);
}

export async function getAuthTokenFromCookies(): Promise<StoredAuthToken | null> {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(AUTH_TOKEN_COOKIE_NAME);
    return parseStoredAuthToken(tokenCookie?.value);
}

export async function restoreAuthTokenIfAvailable(): Promise<boolean> {
    const store = authAsyncLocal.getStore();
    if (store?.resolvedToken !== undefined) {
        return store.resolvedToken != null;
    }

    const token = await getAuthTokenFromCookies();
    if (!token) {
        if (store) {
            store.resolvedToken = null;
        }
        return false;
    }

    const key = token.refreshToken ?? token.accessToken ?? "";
    if (!key) {
        if (store) {
            store.resolvedToken = null;
        }
        return false;
    }

    let promise = tokenRestorePromiseByKey.get(key);
    if (!promise) {
        promise = (async () => {
            try {
                return await resolveStoredAuthToken(token);
            } catch (error) {
                reportError(error, { location: "serverApi.restoreAuthToken", endpoint: "/oauth/token" });
                return null;
            }
        })();
        promise.finally(() => tokenRestorePromiseByKey.delete(key));
        tokenRestorePromiseByKey.set(key, promise);
    }

    const resolvedToken = await promise;
    if (store) {
        store.resolvedToken = resolvedToken;
    }
    return resolvedToken != null;
}

export function resetTokenRestoreCache() {
    const store = authAsyncLocal.getStore();
    if (store) {
        store.resolvedToken = undefined;
    }
}

async function getResolvedAuthToken(): Promise<StoredAuthToken | null> {
    const store = authAsyncLocal.getStore();
    if (store?.resolvedToken !== undefined) {
        return store.resolvedToken;
    }

    const restored = await restoreAuthTokenIfAvailable();
    if (!restored) {
        return null;
    }

    return authAsyncLocal.getStore()?.resolvedToken ?? null;
}

export async function getJobsList(term?: string): Promise<JobLike[]> {
    const token = await getResolvedAuthToken();

    if (token) {
        const tokenStr = tokenToCacheString(token);
        const cacheKey = getJobsListCacheKey(tokenStr, term);
        const now = Date.now();
        const cached = jobsListCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return cached.jobs;
        }

        const apiStartTime = Date.now();
        const endpoint = `GET /jobs/available?term=${term ?? "all"}`;

        try {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Jobs list timeout")), JOBS_LIST_TIMEOUT_MS)
            );

            const requestedTerms = term
                ? JOB_TERMS.filter((value) => value === term)
                : [...JOB_TERMS];

            const result = await Promise.race([
                fetchAvailableJobs(
                    {
                        includeWiderAreas: true,
                        term: requestedTerms.length > 0 ? requestedTerms : [...JOB_TERMS],
                    },
                    { token }
                ),
                timeoutPromise,
            ]);

            logAuthenticatedApiCall(endpoint, apiStartTime);
            const jobs = result.jobs ?? [];
            jobsListCache.set(cacheKey, { jobs, expiresAt: now + JOBS_LIST_CACHE_TTL_MS });
            return jobs;
        } catch (error) {
            logAuthenticatedApiCall(endpoint, apiStartTime, error instanceof Error ? error : new Error(String(error)));
            reportError(error, { location: "serverApi.getJobsList", endpoint: "/jobs/available", term });

            const status = (error as { response?: { status?: number }; status?: number })?.response?.status
                ?? (error as { status?: number })?.status;

            if (status === 500 || status === 502 || status === 503 || status === 504) {
                return [];
            }

            try {
                const publicResult = await fetchPublicJobs();
                return publicResult.jobs ?? [];
            } catch {
                return [];
            }
        }
    }

    try {
        const publicResult = await fetchPublicJobs();
        return publicResult.jobs ?? [];
    } catch {
        return [];
    }
}

const getJobsListCached = cache(getJobsList);
export { getJobsListCached };

export type ApplicationStatusResult = "applied" | "ignored" | "accepted" | "rejected" | null;

export interface JobApplicationDetail {
    status: ApplicationStatusResult;
    employerStatement: EmployerStatement | null;
}

export async function getApplicationStatusForJob(jobId: number): Promise<JobApplicationDetail | null> {
    const token = await getResolvedAuthToken();
    if (!token) return null;

    const tokenStr = tokenToCacheString(token);
    const cacheKey = getApplicationStatusCacheKey(tokenStr, jobId);
    const now = Date.now();
    const cached = applicationStatusCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
        return { status: cached.value, employerStatement: cached.employerStatement };
    }

    const setCache = (value: ApplicationStatusResult, employerStatement: EmployerStatement | null) => {
        applicationStatusCache.set(cacheKey, {
            value,
            employerStatement,
            expiresAt: now + APPLICATION_STATUS_CACHE_TTL_MS,
        });
    };

    const apiStartTime = Date.now();
    const endpoint = "GET /my-applications";

    try {
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Application status timeout")), APPLICATION_STATUS_FETCH_TIMEOUT_MS)
        );

        const result = await Promise.race([
            fetchMyApplications(
                {
                    term: [...JOB_TERMS],
                    limit: 400,
                },
                { token }
            ),
            timeoutPromise,
        ]);

        logAuthenticatedApiCall(endpoint, apiStartTime);
        const application = result.applications.find((item: any) => Number(item.jobId ?? item.job_id) === Number(jobId));
        if (!application) {
            setCache(null, null);
            return { status: null, employerStatement: null };
        }

        const status = application.status;
        const rawEmployerStatement = (application as any).employerStatement ?? (application as any).employer_statement ?? null;
        const employerStatement: EmployerStatement | null =
            rawEmployerStatement === "saved" ||
            rawEmployerStatement === "rejected" ||
            rawEmployerStatement === "waiting_for_response" ||
            rawEmployerStatement === "invited_for_next_round" ||
            rawEmployerStatement === "employed"
                ? rawEmployerStatement
                : null;

        if (status === "applied" || status === "ignored" || status === "accepted" || status === "rejected") {
            setCache(status, employerStatement);
            return { status, employerStatement };
        }

        setCache(null, employerStatement);
        return { status: null, employerStatement };
    } catch (error) {
        logAuthenticatedApiCall(endpoint, apiStartTime, error instanceof Error ? error : new Error(String(error)));
        reportError(error, { location: "serverApi.getApplicationStatusForJob", jobId, endpoint: "/my-applications" });
        return null;
    }
}

// ─── Company detail ───────────────────────────────────────────────────────────

async function fetchCompanyDetail(id: number): Promise<CompanyDetailData> {
    try {
        const result = await fetchCompanyDetailNew(id);
        const d = result.data;
        return {
            company: {
                id: d.id,
                name: d.name,
                slug: d.slug ?? null,
                logo: d.logo ?? null,
                shortDescription: d.shortDescription ?? null,
                location: d.location ?? null,
                studentAudienceNotes: d.studentAudienceNotes ?? null,
                companyOffers: d.companyOffers
                    ? d.companyOffers.map((o) => ({
                          id: o.id,
                          offerType: {
                              id: o.offerType?.id ?? 0,
                              name: o.offerType?.name ?? null,
                              label: o.offerType?.label ?? null,
                          },
                      }))
                    : null,
                contacts: d.contacts
                    ? d.contacts.map((c) => ({
                          id: c.id,
                          firstName: c.firstName,
                          lastName: c.lastName,
                          email: c.email ?? null,
                          phone: c.phone ?? null,
                      }))
                    : null,
                websites: d.websites
                    ? d.websites.map((w) => ({
                          id: w.id,
                          name: w.name,
                          url: w.url,
                          sortOrder: w.sortOrder,
                      }))
                    : null,
            },
            activeJobs: result.jobs.filter((j) => (j.status as unknown as string) === "active"),
            inactiveJobs: result.jobs.filter((j) => (j.status as unknown as string) !== "active"),
        };
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error("Error fetching company:", error);
        }
        const normalized = normalizeApiError(error);
        if (normalized.isTimeout) throw new JobLoadNetworkError("Company detail timeout");
        if (is5xx(normalized.status)) throw new JobLoadNetworkError("Company detail server error");
        const e = error as { code?: string; cause?: { code?: string } };
        const code = e?.code ?? e?.cause?.code ?? "";
        if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET") {
            throw new JobLoadNetworkError("Company detail network error");
        }
        throw error;
    }
}

// ─── unstable_cache wrappers (cross-request, shared across users) ────────────

async function getCompanyDetail(id: number): Promise<CompanyDetailData> {
    const getCachedCompanyDetail = unstable_cache(
        async () => fetchCompanyDetail(id),
        ["company-detail", String(id)],
        { revalidate: 300, tags: [`company-${id}`] }
    );
    return getCachedCompanyDetail();
}

/** Cross-request cached company fetch, deduped per-request via React cache(). */
export const getCompanyDetailCached = cache(getCompanyDetail);

// ─── Companies list (public, no auth) ────────────────────────────────────────

const _getCompaniesList = unstable_cache(
    async () => fetchCompanies(),
    ["companies-list"],
    { revalidate: 60, tags: ["companies-list"] }
);

/** Cross-request cached companies list — used for slug→id resolution and SSR listing. */
export const getCompaniesListCached = cache(_getCompaniesList);

/**
 * Resolves a company slug to its numeric ID using the cached companies list.
 * Returns NaN if no company with that slug exists.
 * Wrapped with React cache() to deduplicate the two calls per request
 * (generateMetadata + page render).
 */
export const resolveCompanySlug = cache(async (slug: string): Promise<number> => {
    try {
        const { companies } = await getCompaniesListCached();
        const match = companies.find((c) => c.slug === slug);
        return match?.id ?? NaN;
    } catch {
        return NaN;
    }
});

