import type { JobTerm } from "@/lib/openapi/types";

export const USER_AUTHORED_JOBS_PAGE_SIZE = 25;
const USER_JOBS_TERM_OPTIONS = ["one_time", "long_term", "full_time"] as const;

export const ADMIN_USER_JOB_STATUSES = [
  "active",
  "expired",
  "draft",
  "archived",
  "banned",
  "not_relevant",
] as const;

export type AdminUserJobStatus = (typeof ADMIN_USER_JOB_STATUSES)[number];
export type UserJobsTermFilter = "all" | JobTerm;
export type UserJobsStatusFilter = "all" | AdminUserJobStatus;

export type UserJobsQueryParams = {
  limit?: number;
  afterId?: number;
  term?: JobTerm[];
  status?: AdminUserJobStatus[];
};

export function buildUserJobsQueryParams({
  afterId,
  term,
  status,
}: {
  afterId?: number;
  term: UserJobsTermFilter;
  status: UserJobsStatusFilter;
}): UserJobsQueryParams {
  return {
    limit: USER_AUTHORED_JOBS_PAGE_SIZE,
    afterId,
    term: term === "all" ? undefined : [term],
    status: status === "all" ? undefined : [status],
  };
}

export function getUserJobsTermOptions(): UserJobsTermFilter[] {
  return ["all", ...USER_JOBS_TERM_OPTIONS];
}

export function getUserJobsStatusOptions(): UserJobsStatusFilter[] {
  return ["all", ...ADMIN_USER_JOB_STATUSES];
}
