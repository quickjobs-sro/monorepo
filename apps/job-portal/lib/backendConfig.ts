const DEFAULT_BACKEND_URL = "https://backend.quickjobs.cz/";
const DEFAULT_CLIENT_ID = "web-app-0BjdRThl0qULR6x2";
const DEFAULT_SECRET = "MVgF8m7mM1qNXsQp";
const DEFAULT_REVISION = "2.4.0";

function normalizeBackendBaseUrl(rawUrl?: string | null): string {
    const baseUrl = (rawUrl || DEFAULT_BACKEND_URL).trim() || DEFAULT_BACKEND_URL;
    const withoutLegacyApiPrefix = baseUrl.replace(/\/api\/?$/, "/");
    return withoutLegacyApiPrefix.endsWith("/") ? withoutLegacyApiPrefix : `${withoutLegacyApiPrefix}/`;
}

export function getBackendBaseUrl(): string {
    const rawUrl = typeof window === "undefined"
        ? process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL
        : process.env.NEXT_PUBLIC_API_URL;

    return normalizeBackendBaseUrl(rawUrl);
}

export function getApiClientId(): string {
    return typeof window === "undefined"
        ? process.env.API_CLIENT_ID ?? process.env.NEXT_PUBLIC_API_CLIENT_ID ?? DEFAULT_CLIENT_ID
        : process.env.NEXT_PUBLIC_API_CLIENT_ID ?? DEFAULT_CLIENT_ID;
}

export function getApiSecret(): string {
    return typeof window === "undefined"
        ? process.env.API_SECRET ?? process.env.NEXT_PUBLIC_API_SECRET ?? DEFAULT_SECRET
        : process.env.NEXT_PUBLIC_API_SECRET ?? DEFAULT_SECRET;
}

export function getApiRevision(): string {
    return typeof window === "undefined"
        ? process.env.API_REVISION ?? process.env.NEXT_PUBLIC_API_REVISION ?? DEFAULT_REVISION
        : process.env.NEXT_PUBLIC_API_REVISION ?? DEFAULT_REVISION;
}

function encodeBase64(value: string): string {
    if (typeof window !== "undefined") {
        return btoa(value);
    }
    return Buffer.from(value).toString("base64");
}

export function getApiBasicAuthHeader(): string {
    return `Basic ${encodeBase64(`${getApiClientId()}:${getApiSecret()}`)}`;
}
