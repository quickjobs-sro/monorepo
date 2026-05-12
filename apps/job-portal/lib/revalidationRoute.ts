import { NextResponse } from "next/server";
import { reportError } from "./reportError";
import {
    isValidRevalidateSecret,
    RevalidationPayloadError,
    resolveRevalidationEvent,
} from "./revalidation";

export type RevalidateResponse = {
    revalidated: boolean;
    tags: string[];
    paths: string[];
    warnings: string[];
    error?: string;
};

type RevalidationHandlerOptions = {
    configuredSecret: string | undefined;
    revalidateTag: (tag: string) => void;
    revalidatePath: (path: string) => void;
};

type RevalidationRequest = Pick<Request, "headers" | "json">;

const NO_STORE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
};

function jsonResponse(body: RevalidateResponse, status: number) {
    return NextResponse.json(body, {
        status,
        headers: NO_STORE_HEADERS,
    });
}

export async function handleRevalidationPost(
    request: RevalidationRequest,
    options: RevalidationHandlerOptions
): Promise<NextResponse<RevalidateResponse>> {
    const providedSecret = request.headers.get("x-revalidate-secret");
    if (!isValidRevalidateSecret(providedSecret, options.configuredSecret)) {
        return jsonResponse({
            revalidated: false,
            tags: [],
            paths: [],
            warnings: [],
            error: "Unauthorized",
        }, 401);
    }

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return jsonResponse({
            revalidated: false,
            tags: [],
            paths: [],
            warnings: [],
            error: "Request body must be valid JSON.",
        }, 400);
    }

    try {
        const result = resolveRevalidationEvent(payload);
        result.tags.forEach((tag) => options.revalidateTag(tag));
        result.paths.forEach((path) => options.revalidatePath(path));

        return jsonResponse({
            revalidated: true,
            tags: result.tags,
            paths: result.paths,
            warnings: result.warnings,
        }, 200);
    } catch (error) {
        if (error instanceof RevalidationPayloadError) {
            return jsonResponse({
                revalidated: false,
                tags: [],
                paths: [],
                warnings: [],
                error: error.message,
            }, 400);
        }

        reportError(error, { location: "api/revalidate" });
        return jsonResponse({
            revalidated: false,
            tags: [],
            paths: [],
            warnings: [],
            error: "Failed to revalidate cache.",
        }, 500);
    }
}
