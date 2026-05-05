import { NextRequest, NextResponse } from "next/server";
import { withAuthContext, getApplicationStatusForJob } from "../../../../../lib/serverApi";
import { reportError } from "../../../../../lib/reportError";

export const maxDuration = 10;

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const jobId = Number(id);
    if (isNaN(jobId) || jobId <= 0 || !Number.isInteger(jobId)) {
        return NextResponse.json({ status: null }, { status: 400 });
    }
    try {
        const detail = await withAuthContext(() => getApplicationStatusForJob(jobId));
        return NextResponse.json({ status: detail?.status ?? null, employerStatement: detail?.employerStatement ?? null });
    } catch (e) {
        reportError(e, { location: "api.jobs.application-status", jobId });
        throw e;
    }
}
