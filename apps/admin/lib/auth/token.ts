import { getExpiryMarginSeconds } from "./constants";

export type StoredAdminToken = {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string | number;
  dateOfExpiration?: string;
  [key: string]: unknown;
};

function decodeBase64(value: string): string {
  if (typeof window !== "undefined") {
    return atob(value);
  }

  return Buffer.from(value, "base64").toString("utf8");
}

export function isValidToken(token: unknown): token is StoredAdminToken {
  if (!token || typeof token !== "object") {
    return false;
  }

  const tokenObject = token as Record<string, unknown>;
  return typeof tokenObject.accessToken === "string" || typeof tokenObject.refreshToken === "string";
}

export function parseStoredAdminToken(rawToken: string | null | undefined): StoredAdminToken | null {
  if (!rawToken) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawToken);
    return isValidToken(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getExpiryDate(expiresIn: unknown): string {
  const seconds = Number(expiresIn);
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
  const expiry = new Date();
  expiry.setSeconds(expiry.getSeconds() + Math.max(safeSeconds - 30, 0));
  return expiry.toISOString();
}

export function getBearerToken(token: StoredAdminToken): string | null {
  return token.accessToken ? `Bearer ${token.accessToken}` : null;
}

export function isTokenExpiredOrExpiringSoon(
  token: StoredAdminToken,
  marginSeconds: number = getExpiryMarginSeconds()
): boolean {
  if (typeof token.dateOfExpiration === "string") {
    const expiry = new Date(token.dateOfExpiration).getTime();
    if (!Number.isNaN(expiry)) {
      return Date.now() + marginSeconds * 1000 >= expiry;
    }
  }

  if (typeof token.accessToken === "string") {
    try {
      const parts = token.accessToken.split(".");
      if (parts.length >= 2) {
        const payload = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = JSON.parse(decodeBase64(payload)) as { exp?: number };
        if (typeof decoded.exp === "number") {
          return Date.now() + marginSeconds * 1000 >= decoded.exp * 1000;
        }
      }
    } catch {
      return true;
    }
  }

  return true;
}
