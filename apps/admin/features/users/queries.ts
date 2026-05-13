import type { UserJobReactionSource, UserJobReactionStatus, UsersQueryParams } from "./api";

export const usersQueryKey = ["admin", "users"] as const;

export function usersListQueryKey(params: UsersQueryParams) {
  return ["admin", "users", "list", params] as const;
}

export function userDetailQueryKey(userId: string) {
  return ["admin", "users", "detail", userId] as const;
}

export function userJobReactionsQueryKey(
  userId: string,
  source: UserJobReactionSource,
  status: UserJobReactionStatus
) {
  return ["admin", "users", "job-reactions", userId, source, status] as const;
}
