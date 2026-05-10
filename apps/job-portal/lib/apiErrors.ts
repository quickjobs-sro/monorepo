/**
 * Normalize errors from quickjobs-api-wrapper so timeout (ETIMEDOUT) is never treated as HTTP 500.
 * The wrapper sets status: 500 on timeout; we map that to 408 (Request Timeout) for correct semantics.
 */

/** 5xx = backend crashed; never show BE response body to user (it can be wrong e.g. "CORS"). */
export const FIVE_XX_USER_MESSAGE =
    "Server není dostupný. Zkus to prosím za chvíli znovu.";

export function is5xx(status: number): boolean {
    return status === 500 || status === 502 || status === 503 || status === 504;
}

export interface NormalizedApiError {
    status: number;
    isTimeout: boolean;
    message: string;
}

const TIMEOUT_MESSAGES = [
    "Job detail timeout",
    "Jobs list timeout",
    "Request timeout",
    "Token restoration timeout",
    "Application API timeout",
];

function isTimeoutError(error: unknown): boolean {
    const e = error as {
        cause?: { code?: string };
        code?: string;
        errno?: string;
        response?: { cause?: { code?: string }; code?: string; errno?: string };
        message?: string;
    };
    if (
        e?.cause?.code === "ETIMEDOUT" ||
        e?.code === "ETIMEDOUT" ||
        e?.errno === "ETIMEDOUT" ||
        e?.response?.cause?.code === "ETIMEDOUT" ||
        e?.response?.code === "ETIMEDOUT" ||
        e?.response?.errno === "ETIMEDOUT"
    ) {
        return true;
    }
    const msg = (error instanceof Error ? error.message : e?.message) ?? "";
    return TIMEOUT_MESSAGES.some((t) => msg.includes(t));
}

export function normalizeApiError(error: unknown): NormalizedApiError {
    if (isTimeoutError(error)) {
        return {
            status: 408,
            isTimeout: true,
            message:
                (error instanceof Error ? error.message : String(error)) ||
                "Request timeout",
        };
    }
    const e = error as {
        response?: { status?: number };
        status?: number;
        message?: string;
    };
    const status = e?.response?.status ?? e?.status ?? 500;
    const message =
        (error instanceof Error ? error.message : e?.message) || String(error);
    return {
        status,
        isTimeout: false,
        message: message || `HTTP ${status}`,
    };
}

/** Thrown when job fetch fails due to timeout/network (so page can show "retry" UI instead of 404). */
export class JobLoadNetworkError extends Error {
    constructor(message: string = "JOB_LOAD_NETWORK_ERROR") {
        super(message);
        this.name = "JobLoadNetworkError";
    }
}
