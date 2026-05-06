import type { FacultiesResponse, FacultyDetail } from "@/lib/openapi/types";
import { fetchJson } from "@/lib/api/fetchJson";

export async function fetchFacultiesBySchoolId(schoolId: number) {
  return fetchJson<FacultiesResponse>("/faculties", {
    auth: true,
    query: {
      schoolId,
    },
  });
}

export async function fetchFacultyDetail(id: string | number) {
  return fetchJson<FacultyDetail>(`/faculties/${id}`, {
    auth: true,
  });
}
