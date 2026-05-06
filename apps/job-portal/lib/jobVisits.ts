import { getBackendBaseUrl } from "./backendConfig";

function buildBackendUrl(path: string): string {
    return new URL(path.replace(/^\/+/, ""), getBackendBaseUrl()).toString();
}

export async function recordJobVisit(jobId: number): Promise<void> {
    if (!Number.isInteger(jobId) || jobId <= 0) {
        throw new Error(`Invalid job ID for visit tracking: ${jobId}`);
    }

    const response = await fetch(buildBackendUrl(`/v1/jobs/${jobId}/visits`), {
        method: "POST",
        cache: "no-store",
        keepalive: true,
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Job visit request failed with status ${response.status}${body ? `: ${body}` : ""}`);
    }
}
