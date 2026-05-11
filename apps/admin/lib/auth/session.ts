import { localFetchJson } from "../api/localFetchJson";
import { createRequestError, isPlainObject } from "../api/shared";
import { getClientStoredAuthToken, persistClientToken } from "./cookie";
import {
  getExpiryDate,
  isTokenExpiredOrExpiringSoon,
  isValidToken,
  type StoredAdminToken,
} from "./token";

export async function refreshStoredToken(token: StoredAdminToken): Promise<StoredAdminToken> {
  if (!token.refreshToken) {
    throw createRequestError(401, "Missing refresh token");
  }

  if (typeof window === "undefined") {
    throw createRequestError(401, "Server-side admin token refresh is not supported.");
  }

  const responseBody = await localFetchJson<unknown>("/api/admin/auth/refresh", {
    method: "POST",
    body: {
      refreshToken: token.refreshToken,
    },
  });

  const refreshedToken = {
    ...token,
    ...(isPlainObject(responseBody) ? responseBody : {}),
  } as StoredAdminToken;

  if (!refreshedToken.dateOfExpiration) {
    refreshedToken.dateOfExpiration = getExpiryDate(refreshedToken.expiresIn);
  }

  if (typeof window !== "undefined") {
    persistClientToken(refreshedToken);
  }

  return refreshedToken;
}

export async function resolveStoredAuthToken(
  token: StoredAdminToken | null | undefined = getClientStoredAuthToken()
): Promise<StoredAdminToken> {
  if (!isValidToken(token)) {
    throw createRequestError(401, "Unauthorized");
  }

  const normalizedToken = token as StoredAdminToken;
  return isTokenExpiredOrExpiringSoon(normalizedToken) ? refreshStoredToken(normalizedToken) : normalizedToken;
}
