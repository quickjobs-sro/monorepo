import { timingSafeEqual } from "node:crypto";

const COMPANY_ACTIONS = ["created", "updated", "deleted", "published", "unpublished"] as const;
const JOB_ACTIONS = ["created", "updated", "published", "unpublished", "deleted"] as const;
const COMPANY_USER_ACTIONS = ["connected", "disconnected"] as const;

type RevalidationEntity = "company" | "job" | "company-user";

export type RevalidationResolution = {
    tags: string[];
    paths: string[];
    warnings: string[];
};

type RevalidationPayload = {
    entity?: unknown;
    action?: unknown;
    id?: unknown;
    slug?: unknown;
    oldSlug?: unknown;
    companyId?: unknown;
    companySlug?: unknown;
    oldCompanyId?: unknown;
    oldCompanySlug?: unknown;
};

export class RevalidationPayloadError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RevalidationPayloadError";
    }
}

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

function isAction<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
    return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function getEntity(value: unknown): RevalidationEntity {
    if (value === "company" || value === "job" || value === "company-user") {
        return value;
    }
    throw new RevalidationPayloadError("Unsupported revalidation entity.");
}

function getId(value: unknown, label: string): number {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new RevalidationPayloadError(`${label} is required and must be a positive integer.`);
    }
    return parsed;
}

function hasValue(value: unknown): boolean {
    return value != null && value !== "";
}

function getSlug(value: unknown, label: string, required: true): string;
function getSlug(value: unknown, label: string, required?: false): string | null;
function getSlug(value: unknown, label: string, required = false): string | null {
    if (value == null || value === "") {
        if (required) {
            throw new RevalidationPayloadError(`${label} is required.`);
        }
        return null;
    }

    if (typeof value !== "string") {
        throw new RevalidationPayloadError(`${label} must be a string.`);
    }

    const slug = value.trim();
    if (!slug) {
        if (required) {
            throw new RevalidationPayloadError(`${label} is required.`);
        }
        return null;
    }

    if (slug.includes("/") || slug.includes("?") || slug.includes("#") || slug === "." || slug === "..") {
        throw new RevalidationPayloadError(`${label} must be a URL path segment, not a path.`);
    }

    return slug;
}

function getOptionalCompanyPair(
    idValue: unknown,
    slugValue: unknown,
    idLabel: string,
    slugLabel: string
): { id: number; slug: string } | null {
    const hasId = hasValue(idValue);
    const hasSlug = hasValue(slugValue);

    if (!hasId && !hasSlug) {
        return null;
    }

    if (!hasId) {
        throw new RevalidationPayloadError(`${idLabel} is required when ${slugLabel} is provided.`);
    }

    if (!hasSlug) {
        throw new RevalidationPayloadError(`${slugLabel} is required when ${idLabel} is provided.`);
    }

    return {
        id: getId(idValue, idLabel),
        slug: getSlug(slugValue, slugLabel, true),
    };
}

function getRequiredCompanyPair(
    idValue: unknown,
    slugValue: unknown,
    idLabel: string,
    slugLabel: string
): { id: number; slug: string } {
    const pair = getOptionalCompanyPair(idValue, slugValue, idLabel, slugLabel);
    if (!pair) {
        throw new RevalidationPayloadError(`${idLabel} and ${slugLabel} are required.`);
    }
    return pair;
}

function resolveCompanyEvent(payload: RevalidationPayload): RevalidationResolution {
    if (!isAction(payload.action, COMPANY_ACTIONS)) {
        throw new RevalidationPayloadError("Unsupported company revalidation action.");
    }

    const id = getId(payload.id, "company.id");
    const slug = getSlug(payload.slug, "company.slug", true);
    const oldSlug = getSlug(payload.oldSlug, "company.oldSlug");

    return {
        tags: ["companies-list", `company-${id}`],
        paths: unique(["/companies", `/companies/${slug}`, oldSlug ? `/companies/${oldSlug}` : ""]),
        warnings: [],
    };
}

function resolveJobEvent(payload: RevalidationPayload): RevalidationResolution {
    if (!isAction(payload.action, JOB_ACTIONS)) {
        throw new RevalidationPayloadError("Unsupported job revalidation action.");
    }

    const id = getId(payload.id, "job.id");
    const company = getRequiredCompanyPair(payload.companyId, payload.companySlug, "job.companyId", "job.companySlug");
    const oldCompany = getOptionalCompanyPair(
        payload.oldCompanyId,
        payload.oldCompanySlug,
        "job.oldCompanyId",
        "job.oldCompanySlug"
    );

    return {
        tags: unique([
            "jobs-list",
            `job-${id}`,
            `company-${company.id}`,
            oldCompany ? `company-${oldCompany.id}` : "",
        ]),
        paths: unique([
            "/jobs",
            `/jobs/detail/${id}`,
            `/companies/${company.slug}`,
            oldCompany ? `/companies/${oldCompany.slug}` : "",
        ]),
        warnings: [],
    };
}

function resolveCompanyUserEvent(payload: RevalidationPayload): RevalidationResolution {
    if (!isAction(payload.action, COMPANY_USER_ACTIONS)) {
        throw new RevalidationPayloadError("Unsupported company-user revalidation action.");
    }

    const companyId = getId(payload.companyId, "companyUser.companyId");
    const companySlug = getSlug(payload.companySlug, "companyUser.companySlug", true);

    return {
        tags: [`company-${companyId}`],
        paths: [`/companies/${companySlug}`],
        warnings: [],
    };
}

export function resolveRevalidationEvent(payload: unknown): RevalidationResolution {
    if (!payload || typeof payload !== "object") {
        throw new RevalidationPayloadError("Revalidation payload must be a JSON object.");
    }

    const data = payload as RevalidationPayload;
    const entity = getEntity(data.entity);
    const result =
        entity === "company"
            ? resolveCompanyEvent(data)
            : entity === "job"
                ? resolveJobEvent(data)
                : resolveCompanyUserEvent(data);

    return {
        tags: result.tags.filter(Boolean),
        paths: result.paths.filter(Boolean),
        warnings: result.warnings,
    };
}

export function isValidRevalidateSecret(
    providedSecret: string | null | undefined,
    configuredSecret: string | undefined
): boolean {
    if (!providedSecret || !configuredSecret) {
        return false;
    }

    const provided = Buffer.from(providedSecret);
    const configured = Buffer.from(configuredSecret);
    if (provided.length !== configured.length) {
        return false;
    }

    return timingSafeEqual(provided, configured);
}
