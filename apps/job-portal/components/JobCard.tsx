"use client";

import { Card, CardContent, CardHeader, CardFooter } from "@ui/components/core/card";
import { Badge } from "@ui/components/core/badge";
import { MapPinIcon, BanknoteIcon } from "lucide-react";
import { NavigationLink } from "@ui/components/core/navigation-link";
import { ConditionalWrapper } from "@ui/helpers/ConditionalWrapper";
import { useEffect, useState } from "react";
import {
    formatJobDateTime,
    formatJobSalary,
    calculateJobTimeLeft,
    getJobTypeInfo,
} from "../lib/jobHelpers";
import { Button } from "@ui/components/core/button";
import type { JobLike } from "../lib/openapi/types";

interface JobCardProps {
    job: JobLike & {
        title?: string;
        timeLeftDays?: number;
        timeLeftHour?: number;
        offer_expires_at?: string;
        created_at?: string;
        createdAt?: string;
        starts_at?: string;
        ends_at?: string;
        stats?: { appliedTotal?: number };
    };
    isInactive?: boolean;
    fromCompanySlug?: string;
    fromCompanyName?: string;
}

export const JobCard = ({ job, isInactive = false, fromCompanySlug, fromCompanyName }: JobCardProps) => {
    const [timeState, setTimeState] = useState<{ timeLeft: string; progressValue: number; progressColor: string }>({
        timeLeft: "",
        progressValue: 0,
        progressColor: "bg-gray-500",
    });

    useEffect(() => {
        const calculated = calculateJobTimeLeft(job, isInactive);
        setTimeState(calculated);
    }, [job, isInactive]);

    const { timeLeft, progressValue, progressColor } = timeState;
    const { jobTypeLabel, badgeBgColor } = getJobTypeInfo(job.term ?? undefined);
    const dateTimeString = formatJobDateTime(job);
    const salaryDisplay = formatJobSalary(job);
    const feedName = (job as any).feedName as string | undefined;
    const appliedTotal = job.stats?.appliedTotal ?? 0;

    return (
        <ConditionalWrapper
            condition={!isInactive}
            wrapper={(children) => {
                const params = new URLSearchParams();
                if (fromCompanySlug) params.set("fromCompany", fromCompanySlug);
                if (fromCompanyName) params.set("fromCompanyName", fromCompanyName);
                const query = params.toString();
                return (
                    <NavigationLink href={`/jobs/detail/${job.id}${query ? `?${query}` : ""}`} className="block">
                        {children}
                    </NavigationLink>
                );
            }}
        >
            <Card
                className={`h-full flex flex-col transition-shadow hover:shadow-lg border ${isInactive ? "bg-gray-100 opacity-75" : "bg-white cursor-pointer"
                    }`}
                style={feedName ? undefined : { minHeight: 560, maxHeight: 560 }}
            >
                <CardHeader className="pb-4 !px-6 !pt-6">
                    <div className="mb-6 flex flex-wrap gap-2 items-center">
                        <Badge
                            className="text-white text-xs font-semibold px-3 py-1.5 rounded-sm uppercase border-0"
                            style={{ backgroundColor: badgeBgColor }}
                        >
                            {jobTypeLabel}
                        </Badge>
                        {feedName && (
                            <Badge className="text-xs font-semibold px-3 py-1.5 rounded-sm uppercase border border-gray-300 bg-white text-gray-600">
                                {feedName}
                            </Badge>
                        )}
                    </div>

                    {dateTimeString && (
                        <div className="text-lg font-medium text-gray-900 mb-3 leading-tight">
                            {dateTimeString}
                        </div>
                    )}


                </CardHeader>

                <CardContent className="!px-6 !pt-0 ">
                    <p className={`text-md text-gray-700 whitespace-pre-wrap leading-relaxed h-full truncate overflow-hidden ${feedName ? "line-clamp-[12] max-h-[320px]" : "max-h-[205px] line-clamp-7"}`}>
                        {job.description}
                    </p>
                </CardContent>

                <CardFooter className="!px-6 !pt-0 !pb-6 flex-col gap-2 mt-auto">
                    {job.place?.address && (
                        <div className="flex items-center  w-full  gap-2.5">
                            <MapPinIcon className="w-4 h-4 flex-shrink-0 text-green-500" strokeWidth={2} />
                            <span className="text-gray-900">{job.place.address}</span>
                        </div>
                    )}
                    {salaryDisplay && (
                        <div className="flex items-center gap-2.5 w-full text-sm mb-2">
                            <BanknoteIcon className="w-4 h-4 flex-shrink-0 text-green-500" strokeWidth={2} />
                            <span className="text-gray-900">{salaryDisplay}</span>
                        </div>
                    )}

                    {job.stats != null && (
                        <div className="flex items-center gap-3 mb-2 rounded-xl px-4 py-2.5 w-full" style={{ backgroundColor: '#EEF2FF' }}>
                            <span className="flex items-center justify-center min-w-7 h-7 rounded-full bg-blue text-white text-xs font-bold">
                                {appliedTotal}
                            </span>
                            <span className="text-sm text-gray-700">
                                {appliedTotal === 0 ? "Zatím se nikdo nepřihlásil" : appliedTotal === 1 ? "zájemce se přihlásil" : appliedTotal < 5 ? "zájemci se přihlásili" : "zájemců se přihlásilo"}
                            </span>
                        </div>
                    )}
                    {!isInactive && timeLeft && (
                        <>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                                <div
                                    className={`h-full rounded-full transition-all ${progressColor}`}
                                    style={{ width: `${progressValue}%` }}
                                    title="Čas do konce nabídky"
                                    aria-label="Čas do konce nabídky"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 w-full text-sm">
                                <span className="text-gray-700">Nabídka končí za</span>
                                <span className="font-semibold text-gray-900">{timeLeft}</span>
                            </div>
                        </>
                    )}
                </CardFooter>
            </Card>
        </ConditionalWrapper>
    );
};
