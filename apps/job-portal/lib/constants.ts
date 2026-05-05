import Cookies from "js-cookie";

export enum CookieName {
    AUTH_TOKEN_PORTAL = "QuickJobsPortal.tokens",
    AUTH_TOKEN_LEGACY = "QuickJobs.tokens", 
}

/**
 * Cookie name for storing authentication tokens in the job portal
 */
export const AUTH_TOKEN_COOKIE_NAME = CookieName.AUTH_TOKEN_PORTAL;

/**
 * Secure cookie options for authentication tokens
 */
export const getAuthTokenCookieOptions = (): Cookies.CookieAttributes => ({
    expires: 30, // 30 days
    secure: typeof window === "undefined"
        ? process.env.NODE_ENV === "production"
        : window.location.protocol === "https:",
    sameSite: "strict", // CSRF protection
    path: "/", // Available site-wide
});

/**
 * Validates that a token object has the required structure
 */
export const isValidToken = (token: unknown): token is { accessToken?: string; refreshToken?: string } => {
    if (!token || typeof token !== "object") {
        return false;
    }
    
    const tokenObj = token as Record<string, unknown>;
    
    // Token should have at least accessToken or refreshToken
    return (
        typeof tokenObj.accessToken === "string" ||
        typeof tokenObj.refreshToken === "string" ||
        typeof tokenObj.token === "string" // Support alternative token structure
    );
};

const DEFAULT_EXPIRY_MARGIN_SECONDS = 300; // 5 min

/**
 * Returns true if token is expired or will expire within marginSeconds.
 * Use this to decide whether to call restoreUserToken (true = should restore).
 * Uses dateOfExpiration from token object first, then JWT exp claim from accessToken.
 */
export function isTokenExpiredOrExpiringSoon(
    token: unknown,
    marginSeconds: number = DEFAULT_EXPIRY_MARGIN_SECONDS
): boolean {
    if (!token || typeof token !== "object") return true;
    const t = token as Record<string, unknown>;

    // 1. dateOfExpiration (ISO string) from API
    const dateOfExpiration = t.dateOfExpiration;
    if (typeof dateOfExpiration === "string") {
        const expiry = new Date(dateOfExpiration).getTime();
        if (!Number.isNaN(expiry)) {
            return Date.now() + marginSeconds * 1000 >= expiry;
        }
    }

    // 2. JWT exp from accessToken
    const accessToken = t.accessToken;
    if (typeof accessToken === "string") {
        try {
            const parts = accessToken.split(".");
            if (parts.length >= 2) {
                const payload = parts[1]!;
                const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
                const decoded = JSON.parse(atob(base64)) as { exp?: number };
                if (typeof decoded.exp === "number") {
                    const expiry = decoded.exp * 1000;
                    return Date.now() + marginSeconds * 1000 >= expiry;
                }
            }
        } catch {
            // ignore parse errors
        }
    }

    // 3. Cannot determine expiry → call restore to be safe
    return true;
}

/**
 * Safely stores an authentication token in a cookie
 * Validates the token structure before storing
 */
export const setAuthToken = (token: unknown): boolean => {
    try {
        if (!isValidToken(token)) {
            console.error("Invalid token structure:", token);
            return false;
        }

        Cookies.set(AUTH_TOKEN_COOKIE_NAME, JSON.stringify(token), getAuthTokenCookieOptions());
        return true;
    } catch (error) {
        console.error("Error storing auth token:", error);
        return false;
    }
};

/**
 * Safely retrieves an authentication token from a cookie
 */
export const getAuthToken = (): unknown | null => {
    try {
        const tokenString = Cookies.get(AUTH_TOKEN_COOKIE_NAME);
        if (!tokenString) {
            return null;
        }

        const token = JSON.parse(tokenString);
        
        // Validate token structure
        if (!isValidToken(token)) {
            console.warn("Invalid token structure in cookie, removing");
            removeAuthToken();
            return null;
        }

        return token;
    } catch (error) {
        console.error("Error retrieving auth token:", error);
        removeAuthToken();
        return null;
    }
};

/**
 * Safely removes an authentication token from cookies
 */
export const removeAuthToken = (): void => {
    try {
        Cookies.remove(AUTH_TOKEN_COOKIE_NAME, { path: "/" });
    } catch (error) {
        console.error("Error removing auth token:", error);
    }
};
