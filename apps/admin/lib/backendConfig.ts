/* eslint-disable turbo/no-undeclared-env-vars */
const DEFAULT_BACKEND_URL = "http://localhost:3000/";
const DEFAULT_REVISION = "admin-v1";

function normalizeBackendBaseUrl(rawUrl?: string | null): string {
  const baseUrl = (rawUrl || DEFAULT_BACKEND_URL).trim() || DEFAULT_BACKEND_URL;
  const withoutLegacyApiPrefix = baseUrl.replace(/\/api\/?$/, "/");
  return withoutLegacyApiPrefix.endsWith("/") ? withoutLegacyApiPrefix : `${withoutLegacyApiPrefix}/`;
}

export function getBackendBaseUrl(): string {
  const rawUrl =
    typeof window === "undefined"
      ? process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL
      : process.env.NEXT_PUBLIC_API_URL;

  return normalizeBackendBaseUrl(rawUrl);
}

export function getApiRevision(): string {
  return typeof window === "undefined"
    ? process.env.API_REVISION ?? process.env.NEXT_PUBLIC_API_REVISION ?? DEFAULT_REVISION
    : process.env.NEXT_PUBLIC_API_REVISION ?? DEFAULT_REVISION;
}
