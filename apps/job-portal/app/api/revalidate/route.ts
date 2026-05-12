import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { handleRevalidationPost } from "../../../lib/revalidationRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    return handleRevalidationPost(request, {
        configuredSecret: process.env.REVALIDATE_SECRET,
        revalidateTag,
        revalidatePath,
    });
}
