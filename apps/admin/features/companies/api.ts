import type {
  AdminCompaniesResponse,
  AdminCompanyCandidateSearchesResponse,
  AdminCompanyOfferTypesResponse,
  AdminCompanyResponse,
  AdminCompanyUserResponse,
  AdminCompanyUsersResponse,
  AssignAdminCompanyUserRequest,
  CompaniesResponse,
  CompanyJobsResponse,
  CreateAdminCompanyRequest,
  UpdateAdminCompanyRequest,
} from "@/lib/openapi/types";
import { fetchJson } from "@/lib/api/fetchJson";
import type { CompanySortOrderStats } from "./companyFormData";

export type AdminCompaniesQueryParams = {
  limit?: number;
  afterId?: number;
  q?: string;
  missingWeb?: boolean;
  missingLogo?: boolean;
  missingContact?: boolean;
};

export type CompanyCandidateSearchesQueryParams = {
  limit?: number;
  beforeCreatedAt?: string;
  beforeId?: number;
};

function toPathId(value: string | number, label: string): string {
  const parsed = typeof value === "number" ? value : Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid ${label}.`);
  }

  return encodeURIComponent(String(parsed));
}

export async function fetchCompanies(params: AdminCompaniesQueryParams = {}) {
  return fetchJson<AdminCompaniesResponse>("/admin/companies", {
    auth: true,
    query: {
      limit: params.limit,
      afterId: params.afterId,
      q: params.q,
      missingWeb: params.missingWeb,
      missingLogo: params.missingLogo,
      missingContact: params.missingContact,
    },
  });
}

export async function fetchPublicCompanies() {
  return fetchJson<CompaniesResponse>("/companies");
}

export async function fetchCompanyDetail(id: string | number) {
  return fetchJson<AdminCompanyResponse>(
    `/admin/companies/${toPathId(id, "company id")}`,
    {
      auth: true,
    },
  );
}

export async function createCompany(body: CreateAdminCompanyRequest) {
  return fetchJson<AdminCompanyResponse>("/admin/companies", {
    auth: true,
    body,
  });
}

export async function updateCompany(
  id: string | number,
  body: UpdateAdminCompanyRequest,
) {
  return fetchJson<AdminCompanyResponse>(
    `/admin/companies/${toPathId(id, "company id")}`,
    {
      auth: true,
      method: "PATCH",
      body,
    },
  );
}

export async function fetchCompanyUsers(
  companyId: string | number,
  params: AdminCompaniesQueryParams = {},
) {
  return fetchJson<AdminCompanyUsersResponse>(
    `/admin/companies/${toPathId(companyId, "company id")}/users`,
    {
      auth: true,
      query: {
        limit: params.limit,
        afterId: params.afterId,
      },
    },
  );
}

export async function assignCompanyUser(
  companyId: string | number,
  userId: string | number,
  body: AssignAdminCompanyUserRequest,
) {
  return fetchJson<AdminCompanyUserResponse>(
    `/admin/companies/${toPathId(companyId, "company id")}/users/${toPathId(userId, "user id")}`,
    {
      auth: true,
      method: "PUT",
      body,
    },
  );
}

export async function unassignCompanyUser(
  companyId: string | number,
  userId: string | number,
) {
  return fetchJson<null>(
    `/admin/companies/${toPathId(companyId, "company id")}/users/${toPathId(userId, "user id")}`,
    {
      auth: true,
      method: "DELETE",
    },
  );
}

export async function fetchCompanyCandidateSearches(
  companyId: string | number,
  params: CompanyCandidateSearchesQueryParams = {},
) {
  return fetchJson<AdminCompanyCandidateSearchesResponse>(
    `/admin/companies/${toPathId(companyId, "company id")}/candidate-searches`,
    {
      auth: true,
      query: {
        limit: params.limit,
        beforeCreatedAt: params.beforeCreatedAt,
        beforeId: params.beforeId,
      },
    },
  );
}

export async function fetchCompanyOfferTypes() {
  return fetchJson<AdminCompanyOfferTypesResponse>(
    "/admin/company-offer-types",
    {
      auth: true,
    },
  );
}

export async function fetchCompanySortOrderStats() {
  return fetchJson<CompanySortOrderStats>(
    "/admin/companies/sort-order-stats",
    {
      auth: true,
    },
  );
}

export async function fetchCompanyJobs(companyId: string | number) {
  return fetchJson<CompanyJobsResponse>(
    `/v1/jobs/public/company/${toPathId(companyId, "company id")}`,
  );
}
