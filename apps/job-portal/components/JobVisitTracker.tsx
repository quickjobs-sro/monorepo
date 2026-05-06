"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordJobVisit } from "../lib/jobVisits";
import { reportError } from "../lib/reportError";

const JOB_DETAIL_PATH_PATTERN = /^\/jobs\/detail\/([1-9]\d*)\/?$/;

function normalizePathname(pathname: string): string {
    return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function JobVisitPathnameTracker() {
    const pathname = usePathname();
    const lastTrackedPathnameRef = useRef<string | null>(null);

    useEffect(() => {
        const match = pathname ? JOB_DETAIL_PATH_PATTERN.exec(pathname) : null;
        if (!match) {
            lastTrackedPathnameRef.current = null;
            return;
        }

        const normalizedPathname = normalizePathname(pathname);
        if (lastTrackedPathnameRef.current === normalizedPathname) {
            return;
        }

        lastTrackedPathnameRef.current = normalizedPathname;
        const jobId = Number(match[1]);

        void recordJobVisit(jobId).catch((error) => {
            reportError(error, { location: "JobVisitTracker.recordJobVisit", jobId });
        });
    }, [pathname]);

    return null;
}

export function JobVisitTracker() {
    return (
        <Suspense fallback={null}>
            <JobVisitPathnameTracker />
        </Suspense>
    );
}
