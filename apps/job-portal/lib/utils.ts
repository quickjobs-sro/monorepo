/**
 * Safely escapes JSON-LD content to prevent XSS attacks.
 * Escapes sequences that could break out of script tags:
 * - < to \u003c (prevents </script> breakouts)
 * - > to \u003e (prevents <script> injection)
 * - & to \u0026 (prevents HTML entity issues)
 */
export const safeJsonLd = (data: object): string => {
    return JSON.stringify(data)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
};

/**
 * Pending job action storage utilities
 */
const PENDING_JOB_ACTION_KEY = "quickjobs_pending_job_action";

export interface PendingJobAction {
    jobId: number;
    action: "apply" | "ignore" | "open_url";
    returnUrl?: string;
    url?: string;
}

export const savePendingJobAction = (action: PendingJobAction): void => {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(PENDING_JOB_ACTION_KEY, JSON.stringify(action));
    } catch (error) {
        console.error("Failed to save pending job action:", error);
    }
};

export const getPendingJobAction = (): PendingJobAction | null => {
    if (typeof window === "undefined") return null;
    try {
        const stored = localStorage.getItem(PENDING_JOB_ACTION_KEY);
        if (!stored) return null;
        return JSON.parse(stored) as PendingJobAction;
    } catch (error) {
        console.error("Failed to get pending job action:", error);
        return null;
    }
};

export const clearPendingJobAction = (): void => {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(PENDING_JOB_ACTION_KEY);
    } catch (error) {
        console.error("Failed to clear pending job action:", error);
    }
};
