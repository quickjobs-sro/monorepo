import type { Company } from "../types";
import {
    camelizeDeep,
    createRequestError,
    getClientStoredAuthToken,
    getBearerToken,
    parseResponseBody,
    resolveStoredAuthToken,
    type StoredAuthToken,
} from "./authSession";
import { getApiRevision, getBackendBaseUrl } from "./backendConfig";
import type {
    AvailableJobsResponse,
    CompaniesResponse,
    CompanyDetailResponse,
    CompanyLookup,
    ExternalJob,
    ExternalJobsResponse,
    FacultiesResponse,
    FacultyLookup,
    JobTerm,
    MyApplicationsResponse,
    ProfileResponse,
    PublicJobDetailResponse,
    PublicJobsResponse,
    SchoolsResponse,
    SchoolLookup,
} from "./openapi/types";

type Primitive = string | number | boolean;
type QueryValue = Primitive | Primitive[] | undefined | null;
type QueryParams = Record<string, QueryValue>;

type ExtendedRequestInit = RequestInit & {
    next?: {
        revalidate?: number;
        tags?: string[];
    };
};

type FetchOptions = {
    auth?: boolean;
    query?: QueryParams;
    signal?: AbortSignal;
    token?: StoredAuthToken | null;
    requestInit?: ExtendedRequestInit;
};

export type MyApplicationsQueryParams = {
    status?: Array<"applied" | "ignored" | "accepted" | "rejected">;
    expired?: "only" | "none" | "any";
    term?: JobTerm[];
    page?: number;
    limit?: number;
};

export type AvailableJobsQueryParams = {
    term?: JobTerm[];
    includeWiderAreas?: boolean;
    fields?: string;
};

export type PublicJobsQueryParams = {
    lat?: number;
    lng?: number;
    term?: JobTerm[];
};

function buildUrl(path: string, query?: QueryParams): string {
    const url = new URL(path.replace(/^\/+/, ""), getBackendBaseUrl());

    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            if (value == null) {
                return;
            }

            if (Array.isArray(value)) {
                if (value.length > 0) {
                    url.searchParams.set(key, value.join(","));
                }
                return;
            }

            url.searchParams.set(key, String(value));
        });
    }

    return url.toString();
}

async function fetchOpenApiJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
        "X-Revision": getApiRevision(),
    };

    if (options.auth) {
        const token = await resolveStoredAuthToken(options.token ?? getClientStoredAuthToken());
        const bearer = getBearerToken(token);
        if (!bearer) {
            throw createRequestError(401, "Unauthorized");
        }
        headers.Authorization = bearer;
    }

    const response = await fetch(buildUrl(path, options.query), {
        method: "GET",
        cache: options.auth ? "no-store" : "default",
        ...options.requestInit,
        headers: {
            ...(options.requestInit?.headers as Record<string, string> | undefined),
            ...headers,
        },
        signal: options.signal,
    });

    const responseBody = camelizeDeep(await parseResponseBody(response));
    if (!response.ok) {
        const message = typeof responseBody === "string"
            ? responseBody
            : `Request failed with status ${response.status}.`;
        throw createRequestError(response.status, message, responseBody);
    }

    return responseBody as T;
}

function mapCompany(company: CompanyLookup): Company {
    return {
        id: company.id,
        name: company.name,
        slug: company.slug ?? null,
        logo: company.logo ?? null,
        shortDescription: company.shortDescription ?? null,
        location: company.location ?? null,
        studentAudienceNotes: company.studentAudienceNotes ?? null,
        companyOffers: company.companyOffers
            ? company.companyOffers.map((o) => ({
                  id: o.id,
                  offerType: {
                      id: o.offerType?.id ?? 0,
                      name: o.offerType?.name ?? null,
                      label: o.offerType?.label ?? null,
                  },
              }))
            : null,
        contacts: company.contacts
            ? company.contacts.map((c) => ({
                  id: c.id,
                  firstName: c.firstName,
                  lastName: c.lastName,
                  email: c.email ?? null,
                  phone: c.phone ?? null,
              }))
            : null,
        websites: company.websites
            ? company.websites.map((w) => ({
                  id: w.id,
                  name: w.name,
                  url: w.url,
                  sortOrder: w.sortOrder,
              }))
            : null,
    };
}

export async function fetchProfile(
    options: Pick<FetchOptions, "signal" | "token"> = {}
): Promise<ProfileResponse> {
    return fetchOpenApiJson<ProfileResponse>("/me/profile", {
        auth: true,
        signal: options.signal,
        token: options.token,
    });
}

export async function fetchAvailableJobs(
    params: AvailableJobsQueryParams = {},
    options: Pick<FetchOptions, "signal" | "token"> = {}
): Promise<AvailableJobsResponse> {
    return fetchOpenApiJson<AvailableJobsResponse>("/jobs/available", {
        auth: true,
        signal: options.signal,
        token: options.token,
        query: {
            term: params.term?.length ? params.term : undefined,
            includeWiderAreas: params.includeWiderAreas,
            fields: params.fields,
        },
    });
}

export async function fetchExternalAppliedJobs(
    params: { limit?: number } = {},
    options: Pick<FetchOptions, "signal" | "token"> = {}
): Promise<ExternalJobsResponse> {
    return fetchOpenApiJson<ExternalJobsResponse>("/v2/jobs/external-applied", {
        auth: true,
        signal: options.signal,
        token: options.token,
        query: { limit: params.limit },
    });
}

export async function fetchExternalIgnoredJobs(
    params: { limit?: number } = {},
    options: Pick<FetchOptions, "signal" | "token"> = {}
): Promise<ExternalJobsResponse> {
    return fetchOpenApiJson<ExternalJobsResponse>("/v2/jobs/external-ignored", {
        auth: true,
        signal: options.signal,
        token: options.token,
        query: { limit: params.limit },
    });
}

export async function fetchExternalJobsList(
    options: Pick<FetchOptions, "signal" | "token"> = {}
): Promise<ExternalJobsResponse> {
    const raw = await fetchOpenApiJson<{ data: ExternalJob[] }>("/v1/external-jobs", {
        auth: true,
        signal: options.signal,
        token: options.token,
    });
    return { jobs: raw.data ?? [] };
}

export async function fetchExternalJobById(
    id: string | number,
    options: Pick<FetchOptions, "signal" | "token"> = {}
): Promise<ExternalJob | null> {
    try {
        const raw = await fetchOpenApiJson<{ data: ExternalJob }>(`/v1/external-jobs/${id}`, {
            auth: true,
            signal: options.signal,
            token: options.token,
        });
        return raw.data ?? null;
    } catch {
        return null;
    }
}

export async function fetchMyApplications(
    params: MyApplicationsQueryParams = {},
    options: Pick<FetchOptions, "signal" | "token"> = {}
): Promise<MyApplicationsResponse> {
    return fetchOpenApiJson<MyApplicationsResponse>("/my-applications", {
        auth: true,
        signal: options.signal,
        token: options.token,
        query: {
            status: params.status?.length ? params.status : undefined,
            expired: params.expired,
            term: params.term?.length ? params.term : undefined,
            page: params.page,
            limit: params.limit,
        },
    });
}

export async function fetchPublicJobsList(
    params: PublicJobsQueryParams = {},
    options: Pick<FetchOptions, "signal"> & { requestInit?: ExtendedRequestInit } = {}
): Promise<PublicJobsResponse> {
    return fetchOpenApiJson<PublicJobsResponse>("/jobs/public", {
        signal: options.signal,
        requestInit: options.requestInit,
        query: {
            lat: params.lat,
            lng: params.lng,
            term: params.term?.length ? params.term : undefined,
        },
    });
}

export async function fetchPublicJobDetail(
    id: string | number,
    options: Pick<FetchOptions, "signal"> & { requestInit?: ExtendedRequestInit } = {}
): Promise<PublicJobDetailResponse> {
    return fetchOpenApiJson<PublicJobDetailResponse>(`/jobs/public/${id}`, {
        signal: options.signal,
        requestInit: options.requestInit,
    });
}

export async function fetchCompanyDetail(
    id: number,
    options: Pick<FetchOptions, "signal"> & { requestInit?: ExtendedRequestInit } = {}
): Promise<CompanyDetailResponse> {
    return fetchOpenApiJson<CompanyDetailResponse>(`/companies/${id}`, {
        signal: options.signal,
        requestInit: options.requestInit,
    });
}

export async function fetchCompanies(
    options: Pick<FetchOptions, "signal"> = {}
): Promise<{ companies: Company[] }> {
    const response = await fetchOpenApiJson<CompaniesResponse>("/companies", {
        signal: options.signal,
    });

    return {
        companies: (response.companies ?? []).map(mapCompany),
    };
}

export async function fetchSchools(
    params: { type?: number } = {},
    options: Pick<FetchOptions, "signal" | "token"> = {}
): Promise<SchoolsResponse> {
    return fetchOpenApiJson<SchoolsResponse>("/schools", {
        auth: true,
        signal: options.signal,
        token: options.token,
        query: {
            type: params.type,
        },
    });
}

export async function fetchFaculties(
    params: { schoolId: number },
    options: Pick<FetchOptions, "signal" | "token"> = {}
): Promise<FacultiesResponse> {
    if (!Number.isInteger(params.schoolId) || params.schoolId <= 0) {
        throw createRequestError(400, "schoolId query parameter must be a positive integer.");
    }

    return fetchOpenApiJson<FacultiesResponse>("/faculties", {
        auth: true,
        signal: options.signal,
        token: options.token,
        query: {
            schoolId: params.schoolId,
        },
    });
}

export type {
    CompanyDetailResponse,
    ExternalJobsResponse,
    FacultyLookup,
    MyApplicationsResponse,
    ProfileResponse,
    PublicJobDetailResponse,
    PublicJobsResponse,
    SchoolLookup,
};
