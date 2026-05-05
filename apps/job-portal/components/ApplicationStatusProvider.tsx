"use client";

import { useEffect, useState } from "react";
import { APPLICATION_STATUS } from "@ui/types/application_status";
import { getAuthToken, isValidToken } from "../lib/constants";
import { useTokenRestore } from "./TokenRestoreProvider";
import { useMyApplications } from "../hooks/useMyApplications";

interface ApplicationStatusProviderProps {
    jobId: number;
    initialStatus?: "applied" | "ignored" | "accepted" | "rejected" | null;
    onStatusChange?: (status: "applied" | "ignored" | "accepted" | "rejected" | null) => void;
    applicationStatusResolvedOnServer?: boolean;
}

export const ApplicationStatusProvider = ({
    jobId,
    initialStatus,
    onStatusChange,
    applicationStatusResolvedOnServer = false,
}: ApplicationStatusProviderProps) => {
    const { mounted, tokenRestored } = useTokenRestore();
    const token = getAuthToken();
    const hasValidToken = mounted && tokenRestored && !!token && isValidToken(token);
    const [detectedStatus, setDetectedStatus] = useState<"applied" | "ignored" | "accepted" | "rejected" | null>(initialStatus ?? null);

    const shouldFetch = hasValidToken && !initialStatus && !applicationStatusResolvedOnServer;
    const { data: appliedData } = useMyApplications({ status: [APPLICATION_STATUS.APPLIED], enabled: shouldFetch });
    const { data: ignoredData } = useMyApplications({ status: [APPLICATION_STATUS.IGNORED], enabled: shouldFetch });
    const { data: acceptedData } = useMyApplications({ status: [APPLICATION_STATUS.ACCEPTED], enabled: shouldFetch });
    const { data: rejectedData } = useMyApplications({ status: [APPLICATION_STATUS.REJECTED], enabled: shouldFetch });

    const hasJobMatch = (data: unknown) => {
        const payload = data as {
            data?: { jobs?: Array<{ id?: number; jobId?: number; job_id?: number }> };
            jobs?: Array<{ id?: number; jobId?: number; job_id?: number }>;
            applications?: Array<{ id?: number; jobId?: number; job_id?: number }>;
        };
        const items = payload?.data?.jobs ?? payload?.jobs ?? payload?.applications ?? [];
        return items.some((item) => Number(item.id ?? item.jobId ?? item.job_id) === Number(jobId));
    };

    useEffect(() => {
        if (initialStatus) {
            setDetectedStatus(initialStatus);
            onStatusChange?.(initialStatus);
            return;
        }
        if (!hasValidToken) return;

        if (hasJobMatch(appliedData)) {
            setDetectedStatus("applied");
            onStatusChange?.("applied");
            return;
        }
        if (hasJobMatch(ignoredData)) {
            setDetectedStatus("ignored");
            onStatusChange?.("ignored");
            return;
        }
        if (hasJobMatch(acceptedData)) {
            setDetectedStatus("accepted");
            onStatusChange?.("accepted");
            return;
        }
        if (hasJobMatch(rejectedData)) {
            setDetectedStatus("rejected");
            onStatusChange?.("rejected");
            return;
        }
        setDetectedStatus(null);
        onStatusChange?.(null);
    }, [jobId, initialStatus, hasValidToken, appliedData, ignoredData, acceptedData, rejectedData, onStatusChange]);

    return null;
};
