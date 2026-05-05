import Cookies from "js-cookie";
import {
    AUTH_TOKEN_COOKIE_NAME,
    getAuthToken,
    getAuthTokenCookieOptions,
    isTokenExpiredOrExpiringSoon,
    isValidToken,
} from "./constants";
import {
    getApiBasicAuthHeader,
    getApiRevision,
} from "./backendConfig";

export type StoredAuthToken = {
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    expiresIn?: string | number;
    dateOfExpiration?: string;
    [key: string]: unknown;
};

export type ApiRequestError = Error & {
    status?: number;
    response?: {
        status?: number;
        data?: unknown;
    };
};

function toCamelCaseKey(key: string): string {
    return key.replace(/[_-]([a-z])/g, (_, char: string) => char.toUpperCase());
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Object.prototype.toString.call(value) === "[object Object]";
}

export function camelizeDeep<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((item) => camelizeDeep(item)) as T;
    }

    if (!isPlainObject(value)) {
        return value;
    }

    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
        acc[toCamelCaseKey(key)] = camelizeDeep(nestedValue);
        return acc;
    }, {}) as T;
}

export function createRequestError(status: number, message: string, data?: unknown): ApiRequestError {
    const error = new Error(message) as ApiRequestError;
    error.status = status;
    error.response = { status, data };
    return error;
}

export async function parseResponseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export function parseStoredAuthToken(rawToken: string | null | undefined): StoredAuthToken | null {
    if (!rawToken) {
        return null;
    }

    try {
        const parsed = JSON.parse(rawToken);
        return isValidToken(parsed) ? (parsed as StoredAuthToken) : null;
    } catch {
        return null;
    }
}

export function getBearerToken(token: StoredAuthToken): string | null {
    if (!token.accessToken) {
        return null;
    }

    const tokenType = typeof token.tokenType === "string" && token.tokenType.length > 0
        ? token.tokenType
        : "Bearer";

    return `${tokenType} ${token.accessToken}`;
}

function getExpiryDate(expiresIn: unknown): string {
    const seconds = Number(expiresIn);
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    const expiry = new Date();
    expiry.setSeconds(expiry.getSeconds() + Math.max(safeSeconds - 30, 0));
    return expiry.toISOString();
}

export function persistClientToken(token: StoredAuthToken): void {
    Cookies.set(
        AUTH_TOKEN_COOKIE_NAME,
        JSON.stringify(token),
        getAuthTokenCookieOptions()
    );
}

export function getClientStoredAuthToken(): StoredAuthToken | null {
    if (typeof window === "undefined") {
        return null;
    }

    return parseStoredAuthToken(Cookies.get(AUTH_TOKEN_COOKIE_NAME));
}

async function syncLegacyToken(token: StoredAuthToken): Promise<void> {
    if (typeof window === "undefined") {
        return;
    }

    const { syncLegacyAuthToken } = await import("./legacyApi");
    await syncLegacyAuthToken(token);
}

export async function refreshStoredToken(token: StoredAuthToken): Promise<StoredAuthToken> {
    if (!token.refreshToken) {
        throw createRequestError(401, "Missing refresh token");
    }

    const response = await fetch("https://api.quickjobs.cz/api/v2/oauth/token", {
        method: "POST",
        headers: {
            Authorization: getApiBasicAuthHeader(),
            "Content-Type": "application/json",
            "X-Revision": getApiRevision(),
        },
        body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: token.refreshToken,
            scope: "user_identity",
        }),
    });

    const responseBody = camelizeDeep(await parseResponseBody(response));
    if (!response.ok) {
        const message = typeof responseBody === "string"
            ? responseBody
            : `Request failed with status ${response.status}.`;
        throw createRequestError(response.status, message, responseBody);
    }

    const refreshedToken = {
        ...token,
        ...(isPlainObject(responseBody) ? responseBody : {}),
    } as StoredAuthToken;

    if (!refreshedToken.dateOfExpiration) {
        refreshedToken.dateOfExpiration = getExpiryDate(refreshedToken.expiresIn);
    }

    if (typeof window !== "undefined") {
        persistClientToken(refreshedToken);
        await syncLegacyToken(refreshedToken);
    }

    return refreshedToken;
}

export async function resolveStoredAuthToken(token: StoredAuthToken | null | undefined): Promise<StoredAuthToken> {
    if (!isValidToken(token)) {
        throw createRequestError(401, "Unauthorized");
    }

    const normalizedToken = token as StoredAuthToken;
    return isTokenExpiredOrExpiringSoon(normalizedToken)
        ? refreshStoredToken(normalizedToken)
        : normalizedToken;
}

export async function restoreClientSessionToken(): Promise<StoredAuthToken | null> {
    const token = getAuthToken();
    if (!isValidToken(token)) {
        return null;
    }

    const restoredToken = await resolveStoredAuthToken(token as StoredAuthToken);
    persistClientToken(restoredToken);
    await syncLegacyToken(restoredToken);
    return restoredToken;
}
