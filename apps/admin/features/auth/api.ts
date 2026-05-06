import type {
  AdminChangePasswordRequest,
  AdminMeResponse,
  AdminPasswordLoginRequest,
  AdminTokenPairResponse,
} from "@/lib/openapi/types";
import { fetchJson } from "@/lib/api/fetchJson";

export async function loginWithPassword(payload: AdminPasswordLoginRequest) {
  return fetchJson<AdminTokenPairResponse>("/admin/auth/password-login", {
    method: "POST",
    body: payload,
  });
}

export async function fetchAdminMe() {
  return fetchJson<AdminMeResponse>("/admin/me", {
    auth: true,
  });
}

export async function changeAdminPassword(payload: AdminChangePasswordRequest) {
  return fetchJson<null>("/admin/me/password", {
    auth: true,
    method: "PATCH",
    body: payload,
  });
}
