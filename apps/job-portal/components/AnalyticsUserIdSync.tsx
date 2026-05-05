"use client";

import { useEffect, useRef } from "react";
import { useGetProfile } from "../hooks/useGetProfile";
import { useTokenRestore } from "./TokenRestoreProvider";
import { getAuthToken, isValidToken } from "../lib/constants";
import { initUserId } from "../lib/analytics";

/** When logged in and profile loaded, set GA4 user_id once. */
export function AnalyticsUserIdSync() {
    const { mounted, tokenRestored } = useTokenRestore();
    const token = mounted ? getAuthToken() : null;
    const hasValidToken = mounted && tokenRestored && !!token && isValidToken(token);
    const { data: profile } = useGetProfile(!!hasValidToken);
    const initedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!hasValidToken || !profile?.data) {
            initedRef.current = null;
            initUserId(null);
            return;
        }
        const data = profile.data as unknown as { id?: unknown; userId?: unknown };
        const id = data?.id ?? data?.userId;
        if (id != null) {
            const s = String(id);
            if (initedRef.current !== s) {
                initedRef.current = s;
                initUserId(s);
            }
        }
    }, [hasValidToken, profile?.data]);

    return null;
}
