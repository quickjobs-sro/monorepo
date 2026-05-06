import { getApiRevision } from "../backendConfig";
import { buildUrl, camelizeDeep, createRequestError, isPlainObject, parseResponseBody } from "../api/shared";
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

  const response = await fetch(buildUrl("/admin/auth/refresh"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Revision": getApiRevision(),
    },
    body: JSON.stringify({
      refreshToken: token.refreshToken,
    }),
  });

  const responseBody = camelizeDeep(await parseResponseBody(response));
  if (!response.ok) {
    const message =
      typeof responseBody === "string"
        ? responseBody
        : `Request failed with status ${response.status}.`;
    throw createRequestError(response.status, message, responseBody);
  }

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
