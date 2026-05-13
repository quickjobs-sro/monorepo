import type {
  AdminUserJobReactionsResponse,
  AdminUserResponse,
  AdminUserDetailResponse,
  AdminUsersResponse,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from "@/lib/openapi/types";
import { fetchJson } from "@/lib/api/fetchJson";

export type UsersQueryParams = {
  limit?: number;
  afterId?: number;
  q?: string;
  companyId?: number;
  role?: string;
  enabled?: boolean;
  deleted?: boolean;
};

export type UserJobReactionSource = "internal" | "external";
export type UserJobReactionStatus = "applied" | "ignored";

export type UserJobReactionsQueryParams = {
  source: UserJobReactionSource;
  status?: UserJobReactionStatus[];
  limit?: number;
  beforeUpdatedAt?: string;
  beforeId?: number;
};

function toPathId(value: string | number, label: string): string {
  const parsed = typeof value === "number" ? value : Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid ${label}.`);
  }

  return encodeURIComponent(String(parsed));
}

export async function fetchUsers(params: UsersQueryParams = {}) {
  return fetchJson<AdminUsersResponse>("/admin/users", {
    auth: true,
    query: {
      limit: params.limit,
      afterId: params.afterId,
      q: params.q,
      companyId: params.companyId,
      role: params.role,
      enabled: params.enabled,
      deleted: params.deleted,
    },
  });
}

export async function fetchUserDetail(userId: string | number) {
  return fetchJson<AdminUserDetailResponse>(`/admin/users/${toPathId(userId, "user id")}`, {
    auth: true,
  });
}

export async function createUser(body: CreateAdminUserRequest) {
  return fetchJson<AdminUserResponse>("/admin/users", {
    auth: true,
    body,
  });
}

export async function updateUser(userId: string | number, body: UpdateAdminUserRequest) {
  return fetchJson<AdminUserResponse>(`/admin/users/${toPathId(userId, "user id")}`, {
    auth: true,
    method: "PATCH",
    body,
  });
}

export async function fetchUserJobReactions(userId: string | number, params: UserJobReactionsQueryParams) {
  return fetchJson<AdminUserJobReactionsResponse>(`/admin/users/${toPathId(userId, "user id")}/job-reactions`, {
    auth: true,
    query: {
      source: params.source,
      status: params.status,
      limit: params.limit,
      beforeUpdatedAt: params.beforeUpdatedAt,
      beforeId: params.beforeId,
    },
  });
}
