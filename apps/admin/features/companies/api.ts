import type { CompaniesResponse, CompanyDetailResponse } from "@/lib/openapi/types";
import { fetchJson } from "@/lib/api/fetchJson";

export async function fetchCompanies() {
  return fetchJson<CompaniesResponse>("/companies");
}

export async function fetchCompanyDetail(id: string | number) {
  return fetchJson<CompanyDetailResponse>(`/companies/${id}`);
}
