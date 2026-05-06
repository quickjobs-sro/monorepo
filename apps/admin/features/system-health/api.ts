import type { HealthResponse } from "@/lib/openapi/types";
import { fetchJson } from "@/lib/api/fetchJson";

export async function fetchHealth() {
  return fetchJson<HealthResponse>("/health");
}
