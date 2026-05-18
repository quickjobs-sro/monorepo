import { format } from "date-fns";
import { cs } from "date-fns/locale";
import type { JobLike } from "./openapi/types";

interface JobWithVariants extends JobLike {
    [key: string]: any;
}

/**
 * Helper to get value from job (handles both camelCase and snake_case)
 */
export const getJobValue = (job: JobWithVariants, camelKey: string, snakeKey: string) => {
    return job[camelKey] ?? job[snakeKey] ?? null;
};

/**
 * Helper to format date and time for job cards
 */
export const formatJobDateTime = (job: JobWithVariants): string => {
    const startAtDate = getJobValue(job, "startsAt", "starts_at");
    const endsAtDate = getJobValue(job, "endsAt", "ends_at");
    const startAt = startAtDate ? new Date(startAtDate) : null;
    const endsAt = endsAtDate ? new Date(endsAtDate) : null;

    if (!startAt) return "Nástup co nejdříve";

    const dayName = format(startAt, "EEEE", { locale: cs });
    const datePart = format(startAt, "d. M.", { locale: cs });
    let dateTimeString = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${datePart}`;

    if (startAt && endsAt) {
        const timePart = `${format(startAt, "HH:mm", { locale: cs })} - ${format(endsAt, "HH:mm", { locale: cs })}`;
        dateTimeString += ` / ${timePart}`;
    }

    return dateTimeString;
};

/**
 * Helper to format salary for job cards
 */
export const formatJobSalary = (job: JobWithVariants): string => {
    const salary = getJobValue(job, "salary", "salary");
    const salaryTo = getJobValue(job, "salaryTo", "salary_to");
    const salaryType = getJobValue(job, "salaryType", "salary_type");

    if (!salary || !salaryType) return "";

    const from = Number(salary).toLocaleString("cs-CZ", {
        maximumFractionDigits: 0,
    });
    const to = salaryTo
        ? Number(salaryTo).toLocaleString("cs-CZ", {
            maximumFractionDigits: 0,
        })
        : null;

    const typeLabel =
        salaryType === "hour" ? "hod." : salaryType === "total" ? "práci" : "měsíc";

    return to ? `${from} - ${to} Kč/${typeLabel}` : `${from} Kč/${typeLabel}`;
};

/**
 * Helper to calculate time left and progress for job cards
 */
export const calculateJobTimeLeft = (
    job: JobWithVariants,
    isInactive: boolean
): { timeLeft: string; progressValue: number; progressColor: string } => {
    const expiresAt = getJobValue(job, "offerExpiresAt", "offer_expires_at");
    const createdDate = getJobValue(job, "createdAt", "created_at");
    const expirationDate = expiresAt ? new Date(expiresAt) : null;
    const created = createdDate ? new Date(createdDate) : null;

    let timeLeft = "";
    let progressValue = 0;

    if (expirationDate && !isInactive && created) {
        const now = new Date();
        const diffMs = expirationDate.getTime() - now.getTime();

        if (diffMs > 0) {
            const totalMs = expirationDate.getTime() - created.getTime();
            progressValue = Math.max(0, Math.min(100, (diffMs / totalMs) * 100));

            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            if (days > 0) {
                const dayLabel = days === 1 ? "den" : "dnů";
                timeLeft = `${days} ${dayLabel} ${hours} hod.`;
            } else if (hours > 0) {
                timeLeft = `${hours} hod.`;
            }
        }
    }

    const progressColor = progressValue > 30 ? "bg-green-500" : "bg-red-500";

    return { timeLeft, progressValue, progressColor };
};

/** Badge background colors used on job cards and filter badges (single source of truth) */
export const JOB_TYPE_BADGE_COLORS = {
    one_time: "#2563eb",
    long_term: "#2fbd68",
    full_time: "#ca8a04",
} as const;

/**
 * Helper to get job type label and badge color
 */
export const getJobTypeInfo = (term: string | undefined) => {
    const jobTypeLabel =
        term === "one_time"
            ? "JEDNORÁZOVÁ BRIGÁDA"
            : term === "long_term"
                ? "DLOUHODOBÁ BRIGÁDA"
                : "PLNÝ ÚVAZEK";

    const badgeBgColor =
        term === "one_time"
            ? JOB_TYPE_BADGE_COLORS.one_time
            : term === "long_term"
                ? JOB_TYPE_BADGE_COLORS.long_term
                : JOB_TYPE_BADGE_COLORS.full_time;

    return { jobTypeLabel, badgeBgColor };
};

/**
 * Extract title from job description (first 8 words of first sentence)
 */
export const extractJobTitle = (description: string): string => {
    const plain = description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const sentences = plain.split(/[.!?\n]/);
    const firstSentence = sentences[0] || plain;
    const words = firstSentence.split(" ").filter(Boolean);
    return words.slice(0, 8).join(" ") + (words.length > 8 ? "..." : "");
};

/**
 * Calculate time left until job expires
 */
export const calculateTimeLeft = (
    expiresAt: string | Date | undefined,
    createdAt?: string | Date | undefined
): { days: number; hours: number } => {
    if (!expiresAt) return { days: 0, hours: 0 };
    
    const now = new Date();
    const expires = new Date(expiresAt);
    
    if (Number.isNaN(expires.getTime())) return { days: 0, hours: 0 };
    
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return { days: 0, hours: 0 };
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return {
        days: Math.max(0, days),
        hours: Math.max(0, hours),
    };
};
