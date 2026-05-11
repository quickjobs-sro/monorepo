import type { JobTerm } from "@/lib/openapi/types";

export function jobsQueryKey(term: JobTerm[], includeWiderAreas = false) {
  return ["admin", "jobs", "canonical", term.join(","), includeWiderAreas] as const;
}

export function jobDetailQueryKey(jobId: string) {
  return ["admin", "jobs", "canonical", jobId] as const;
}

export function jobDispatchesQueryKey(jobId: string) {
  return ["admin", "jobs", "dispatches", jobId] as const;
}
