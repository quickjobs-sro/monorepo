import Cookies from "js-cookie";
import { AUTH_TOKEN_COOKIE_NAME, getAuthTokenCookieOptions } from "./constants";
import { parseStoredAdminToken, type StoredAdminToken } from "./token";

export function persistClientToken(token: StoredAdminToken): void {
  Cookies.set(AUTH_TOKEN_COOKIE_NAME, JSON.stringify(token), getAuthTokenCookieOptions());
}

export function getClientStoredAuthToken(): StoredAdminToken | null {
  if (typeof window === "undefined") {
    return null;
  }

  return parseStoredAdminToken(Cookies.get(AUTH_TOKEN_COOKIE_NAME));
}

export function removeClientStoredAuthToken(): void {
  Cookies.remove(AUTH_TOKEN_COOKIE_NAME, { path: "/" });
}
