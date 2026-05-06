import Cookies from "js-cookie";

export const AUTH_TOKEN_COOKIE_NAME = "QuickJobsAdmin.tokens";
const DEFAULT_EXPIRY_MARGIN_SECONDS = 300;

export function getAuthTokenCookieOptions(): Cookies.CookieAttributes {
  return {
    expires: 30,
    secure: typeof window === "undefined" ? true : window.location.protocol === "https:",
    sameSite: "strict",
    path: "/",
  };
}

export function getExpiryMarginSeconds(): number {
  return DEFAULT_EXPIRY_MARGIN_SECONDS;
}
