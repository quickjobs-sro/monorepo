"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getAuthToken, isValidToken } from "../lib/constants";
import { normalizeApiError } from "../lib/apiErrors";
import { reportError } from "../lib/reportError";
import { restoreClientSessionToken } from "../lib/authSession";

interface TokenRestoreContextType {
    tokenRestored: boolean;
    mounted: boolean;
    triggerRestore: () => Promise<void>;
}

const TokenRestoreContext = createContext<TokenRestoreContextType | null>(null);

const noopRestore = (): Promise<void> => Promise.resolve();
const DEFAULT_TOKEN_RESTORE: TokenRestoreContextType = { mounted: false, tokenRestored: false, triggerRestore: noopRestore };

export const useTokenRestore = (): TokenRestoreContextType => {
    const context = useContext(TokenRestoreContext);
    if (context === null) {
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
            console.warn("useTokenRestore used outside TokenRestoreProvider – using safe default");
        }
        return DEFAULT_TOKEN_RESTORE;
    }
    return context;
};

interface TokenRestoreProviderProps {
    children: ReactNode;
}

export const TokenRestoreProvider = ({ children }: TokenRestoreProviderProps) => {
    const [mounted, setMounted] = useState(false);
    const [tokenRestored, setTokenRestored] = useState(false);
    const pathname = usePathname();
    const lastRestorePathnameRef = useRef<string | null>(null);
    const lastRestoreTimeRef = useRef<number>(0);
    const lastApiCallTimeRef = useRef<number>(0);
    const RESTORE_DEBOUNCE_MS = 2000;
    /** Min time between actual BE token-restore calls (any path) to avoid DDOS on rapid nav. */
    const TOKEN_RESTORE_API_COOLDOWN_MS = 5000;

    const triggerRestore = useCallback(async (): Promise<void> => {
        const token = getAuthToken();
        if (!token || !isValidToken(token)) return;
        try {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Token restoration timeout")), 5000)
            );
            await Promise.race([restoreClientSessionToken(), timeoutPromise]);
        } catch (error: unknown) {
            normalizeApiError(error);
            // Caller will refetch and handle 401 if still failing
        }
    }, []);

    // Set mounted before first paint so we don't flash loading; cookie access is safe only after mount.
    useLayoutEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const path = pathname ?? "";
        const now = Date.now();
        if (lastRestorePathnameRef.current === path && now - lastRestoreTimeRef.current < RESTORE_DEBOUNCE_MS) {
            return;
        }
        lastRestorePathnameRef.current = path;
        lastRestoreTimeRef.current = now;

        const restoreToken = async () => {
            const token = getAuthToken();

            if (!token || !isValidToken(token)) {
                setTokenRestored(true);
                return;
            }

            const now = Date.now();
            if (now - lastApiCallTimeRef.current < TOKEN_RESTORE_API_COOLDOWN_MS) {
                setTokenRestored(true);
                return;
            }
            lastApiCallTimeRef.current = now;

            try {
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("Token restoration timeout")), 5000)
                );

                await Promise.race([restoreClientSessionToken(), timeoutPromise]);
            } catch (error: unknown) {
                const normalized = normalizeApiError(error);
                reportError(error, { location: "TokenRestoreProvider.restoreToken", status: normalized.status });
                const errorMessage = normalized.message;

                if (error instanceof SyntaxError) {
                    console.error("❌ [TOKEN RESTORE] Error parsing token:", error);
                } else {
                    const isBackendDown =
                        !normalized.isTimeout &&
                        (normalized.status === 502 ||
                            normalized.status === 500 ||
                            normalized.status === 503 ||
                            normalized.status === 504);
                    console.warn("⚠️ [TOKEN RESTORE] Failed - endpoint: /oauth/token", {
                        status: normalized.status,
                        errorMessage,
                        isBackendDown,
                        note: "Continuing with existing token - app will still work",
                    });
                }
                setTokenRestored(true); // required: do not remove when stripping debug logs
                return;
            }
            setTokenRestored(true); // required: do not remove when stripping debug logs
        };

        restoreToken();
    }, [mounted, pathname]);

    return (
        <TokenRestoreContext.Provider value={{ tokenRestored, mounted, triggerRestore }}>
            {children}
        </TokenRestoreContext.Provider>
    );
};
