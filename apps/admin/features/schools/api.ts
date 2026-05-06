import type { SchoolDetail, SchoolsResponse } from "@/lib/openapi/types";
import { fetchJson } from "@/lib/api/fetchJson";

export async function fetchSchools() {
  return fetchJson<SchoolsResponse>("/schools", {
    auth: true,
  });
}

export async function fetchSchoolDetail(id: string | number) {
  return fetchJson<SchoolDetail>(`/schools/${id}`, {
    auth: true,
    query: {
      includeFaculties: true,
    },
  });
}
