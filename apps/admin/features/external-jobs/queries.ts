import type { JobTerm } from "@/lib/openapi/types";

export function externalJobsQueryKey(term: JobTerm[], limit: number) {
  return ["admin", "external-jobs", term.join(","), limit] as const;
}

export function externalJobDetailQueryKey(jobId: string) {
  return ["admin", "external-jobs", jobId] as const;
}
