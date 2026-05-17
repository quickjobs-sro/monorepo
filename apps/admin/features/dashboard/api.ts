import { fetchJson } from "@/lib/api/fetchJson";
import type {
  AdminKpisJobsPerformanceResponse,
  AdminKpisTrafficResponse,
} from "@/lib/openapi/types";
import type {
  AdminKpisJobsPerformanceQuery,
  AdminKpisTrafficQuery,
} from "./kpiParams";

export function fetchTrafficKpis(params: AdminKpisTrafficQuery) {
  return fetchJson<AdminKpisTrafficResponse>("/admin/kpis/traffic", {
    auth: true,
    query: params,
  });
}

export function fetchJobsPerformanceKpis(
  params: AdminKpisJobsPerformanceQuery
) {
  return fetchJson<AdminKpisJobsPerformanceResponse>(
    "/admin/kpis/jobs/performance",
    {
      auth: true,
      query: params,
    }
  );
}
