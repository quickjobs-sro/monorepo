import type { JobTerm } from "@/lib/openapi/types";

export function jobsQueryKey(term: JobTerm[]) {
  return ["admin", "jobs", term.join(",")] as const;
}

export function jobDetailQueryKey(jobId: string) {
  return ["admin", "jobs", jobId] as const;
}
