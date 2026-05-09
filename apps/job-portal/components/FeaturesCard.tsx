"use client";

import { ConditionalWrapper } from "@ui/helpers/ConditionalWrapper";
import { Avatar, AvatarImage } from "@ui/components/core/avatar";
import { Badge } from "@ui/components/core/badge";
import { Card, CardContent, CardHeader, CardFooter } from "@ui/components/core/card";
import { CommentRatings } from "@ui/components/core/rating";
import { getJobEndAtDaysAndHours } from "@ui/helpers/getJobEndAtDaysAndHours";
import { getSalaryString } from "@ui/helpers/getSalaryString";
import { getStartDateString } from "@ui/helpers/getStartDateString";
import { format } from "date-fns";
import { MapPin, BanknoteIcon, Check } from "lucide-react";
import { NavigationLink } from "@ui/components/core/navigation-link";
import Image from "next/image";
import { MobileAppButtons } from "./MobileAppButtons";
import { cs } from "date-fns/locale/cs";
import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getAuthToken, isValidToken } from "../lib/constants";
import { Button } from "@ui/components/core/button";
import { TrackedButton } from "@ui/components/core/tracked-button";
import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../lib/legacyApi";
import { useToast } from "@ui/hooks/use-toast";
import { useGetProfile } from "../hooks/useGetProfile";
import { useTokenRestore } from "./TokenRestoreProvider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@ui/components/core/dialog";
import { API_KEYS } from "@ui/types/api_keys";
import { APPLICATION_STATUS, EXTERNAL_JOB_TYPE } from "@ui/types/application_status";
import { savePendingJobAction } from "../lib/utils";
import { ApplicationStatusProvider } from "./ApplicationStatusProvider";
import { reportError } from "../lib/reportError";
import { ShareButtons } from "./ShareButtons";
import type { JobLike } from "../lib/openapi/types";

const JOB_VALIDITY_DAYS = 30;

function sanitizeJobHtml(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, "")
        .replace(/\s+on\w+="[^"]*"/gi, "")
        .replace(/\s+on\w+='[^']*'/gi, "")
        .replace(/href="javascript:[^"]*"/gi, "")
        .replace(/href='javascript:[^']*'/gi, "");
}

const INDEFINITE_VALUES = ["indefinite", "neurončité", "neurončitá", "neuroncita", "permanent", "permanentni"];
const FLEXIBLE_VALUES = ["flexible", "flexibilní", "flexibilni"];

function isIndefinitePeriod(value: string | undefined): boolean {
    const v = String(value ?? "").toLowerCase().trim();
    return INDEFINITE_VALUES.some((x) => v === x);
}

function isFlexibleTime(value: string | undefined): boolean {
    const v = String(value ?? "").toLowerCase().trim();
    return FLEXIBLE_VALUES.some((x) => v === x);
}

interface FeaturesCardProps {
    term: JobLike["term"];
    description: string;
    salary?: number;
    salaryTo?: number;
    salaryType?: JobLike["salaryType"];
    requirements?: string[];
    id: number;
    place?: JobLike["place"];
    startsAt?: string;
    endsAt?: string;
    isDetail?: boolean;
    author?: {
        avatarImage?: { url?: string };
        givenName?: string;
        familyName?: string;
        rating?: number;
        description?: string;
    };
    stats?: {
        appliedTotal?: number;
    };
    offerExpiresAt?: string;
    offer_expires_at?: string;
    timeLeftDays?: number;
    timeLeftHour?: number;
    title?: string;
    benefits?: string;
    timeFlexibility?: string;
    time_flexibility?: string;
    doesStartImmediately?: boolean;
    does_start_immediately?: boolean;
    timePeriod?: string;
    time_period?: string;
    isInactive?: boolean;
    status?: string;
    createdAt?: string;
    created_at?: string;
    applicationStatus?: "applied" | "ignored" | "accepted" | "rejected";
    /** When true, server already resolved status (even if null); client should not fetch. */
    applicationStatusResolvedOnServer?: boolean;
    employerStatement?: "saved" | "rejected" | "waiting_for_response" | "invited_for_next_round" | "employed" | null;
    isExternal?: boolean;
    externalUrl?: string;
    feedName?: string;
}

export default function FeaturesCard({
    term,
    description,
    salary,
    salaryTo,
    salaryType,
    requirements,
    id,
    place,
    startsAt,
    endsAt,
    isDetail = false,
    author,
    stats,
    offerExpiresAt,
    offer_expires_at,
    timeLeftDays,
    timeLeftHour,
    title,
    benefits,
    timeFlexibility,
    time_flexibility,
    doesStartImmediately,
    does_start_immediately,
    timePeriod,
    time_period,
    isInactive = false,
    status,
    createdAt,
    created_at,
    applicationStatus,
    applicationStatusResolvedOnServer = false,
    employerStatement,
    isExternal = false,
    externalUrl,
    feedName,
}: FeaturesCardProps) {
    const expiresAt = offerExpiresAt || offer_expires_at || "";
    const createdDate = created_at || createdAt || "";
    const jobStartsAt = startsAt;
    const jobEndsAt = endsAt;

    // Calculate progress value on client side only to avoid hydration mismatch
    const [progressValue, setProgressValue] = useState(0);
    const router = useRouterWithNavigationLoading();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    useEffect(() => {
        if (!createdDate || !expiresAt || isInactive) {
            setProgressValue(0);
            return;
        }

        const created = new Date(createdDate);
        const future = new Date(expiresAt);
        const now = new Date();

        const totalMs = future.getTime() - created.getTime(); // total validity
        const leftMs = future.getTime() - now.getTime(); // how much is left

        if (leftMs <= 0) {
            setProgressValue(0);
            return;
        }
        if (leftMs >= totalMs) {
            setProgressValue(100);
            return;
        }

        // Convert to percentage and round to 2 decimal places to avoid precision issues
        const value = (leftMs / totalMs) * 100;
        setProgressValue(Math.round(value * 100) / 100);
    }, [createdDate, expiresAt, isInactive]);

    const progressColor = progressValue > 30 ? "bg-green" : "bg-red-500";

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { mounted, tokenRestored } = useTokenRestore();
    const token = getAuthToken();
    const hasValidToken = mounted && tokenRestored && !!token && isValidToken(token);
    const { data: userProfile } = useGetProfile(!!hasValidToken);
    const user = userProfile?.data;

    const isLoggedIn = mounted && token && user;
    const hasCompletedOnboarding = user?.email && user.email.length > 0;
    const [dynamicApplicationStatus, setDynamicApplicationStatus] = useState<"applied" | "ignored" | "accepted" | "rejected" | null | undefined>(applicationStatus);
    const [dynamicEmployerStatement, setDynamicEmployerStatement] = useState<"saved" | "rejected" | "waiting_for_response" | "invited_for_next_round" | "employed" | null | undefined>(employerStatement);

    // Sync when server sends a real status or when job id changes (new job = reset so fetch can run)
    const prevIdRef = useRef(id);
    useEffect(() => {
        if (prevIdRef.current !== id) {
            prevIdRef.current = id;
            setDynamicApplicationStatus(applicationStatus);
            setDynamicEmployerStatement(employerStatement);
        } else if (applicationStatus === "applied" || applicationStatus === "ignored" || applicationStatus === "accepted" || applicationStatus === "rejected") {
            setDynamicApplicationStatus(applicationStatus);
            setDynamicEmployerStatement(employerStatement);
        }
    }, [id, applicationStatus, employerStatement]);

    const hasStatusFromServer =
        applicationStatus === "applied" || applicationStatus === "ignored" || applicationStatus === "accepted" || applicationStatus === "rejected";
    useEffect(() => {
        if (!isDetail || !id || hasStatusFromServer) return;
        let cancelled = false;
        const endpoint = `/api/jobs/${id}/application-status`;
        fetch(endpoint, { credentials: "include" })
            .then((res) => {
                return res.ok ? res.json() : { status: null, employerStatement: null };
            })
            .then((data: { status: "applied" | "ignored" | "accepted" | "rejected" | null; employerStatement?: "saved" | "rejected" | "waiting_for_response" | "invited_for_next_round" | "employed" | null }) => {
                if (!cancelled) {
                    if (data?.status != null) setDynamicApplicationStatus(data.status);
                    if (data?.employerStatement != null) setDynamicEmployerStatement(data.employerStatement);
                }
            })
            .catch((err) => {
                reportError(err, { location: "FeaturesCard.application-status", jobId: id });
            });
        return () => {
            cancelled = true;
        };
    }, [isDetail, id, hasStatusFromServer]);

    const [isDisabled, setIsDisabled] = useState(false);
    const [lastClickTime, setLastClickTime] = useState(0);
    const [showFillModal, setShowFillModal] = useState(false);
    const [showCheckModal, setShowCheckModal] = useState(false);
    const [showInterested, setShowInterested] = useState(false);
    const mutationInProgressRef = useRef(false);

    const jobMutation = useMutation({
        mutationFn: ({ status }: { status: "apply" | "ignore" }) => {
            if (mutationInProgressRef.current) {
                throw new Error("Mutation already in progress");
            }

            mutationInProgressRef.current = true;

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Application API timeout")), 5000)
            );

            return (Promise.race([
                API.applications.createApplication(id, status),
                timeoutPromise,
            ]) as Promise<any>)
                .then((data) => {
                    return data;
                })
                .catch((err) => {
                    throw err;
                });
        },
        mutationKey: ["jobApplication", id],
        onSuccess: async (data, variables) => {
            mutationInProgressRef.current = false;
            // Safety net: reset ref after 10s in case of edge cases (align with RN)
            setTimeout(() => {
                mutationInProgressRef.current = false;
            }, 10000);

            if (variables.status === "apply") {
                setShowCheckModal(false);
                setShowInterested(true);
            }

            // Invalidate queries - use prefix matching to invalidate all related queries
            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS] });
            // Invalidate all myApplications queries (prefix match will catch all status arrays)
            queryClient.invalidateQueries({
                queryKey: [API_KEYS.JOB_APPLICATIONS, "myApplications"]
            });
            // Invalidate both external job types (prefix match will catch both)
            queryClient.invalidateQueries({
                queryKey: [API_KEYS.JOBS, "external"]
            });

        },
        onError: (error: any) => {
            mutationInProgressRef.current = false;
            reportError(error, { location: "FeaturesCard.application", jobId: id });

            if (error?.message?.includes("timeout")) {
                setIsDisabled(false);
                toast({
                    title: "Přihláška se neodeslala - zkus to znovu",
                    variant: "destructive",
                    duration: 3000,
                });
            } else if (error?.response?.status === 409) {
                toast({
                    title: "Už jsi se k této nabídce přihlásil/a",
                    duration: 3000,
                });
            } else {
                setIsDisabled(false);
                toast({
                    title: "Chyba při odesílání - zkus to znovu",
                    variant: "destructive",
                    duration: 3000,
                });
            }
        },
    });

    // Reset disabled state when user data loads
    useEffect(() => {
        if (user) {
            setIsDisabled(false);
            mutationInProgressRef.current = false;
        }
    }, [user]);

    const handleApply = useCallback(() => {
        if (!isLoggedIn) {
            const returnUrl = encodeURIComponent(currentUrl);
            savePendingJobAction({ jobId: id, action: "apply", returnUrl: currentUrl });
            router.push(`/login?returnUrl=${returnUrl}`);
            return;
        }

        if (!hasCompletedOnboarding) {
            const returnUrl = encodeURIComponent(currentUrl);
            router.push(`/onboarding?returnUrl=${returnUrl}`);
            return;
        }

        if (isDisabled) return;

        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime;

        if (timeSinceLastClick < 1000) {
            return;
        }

        setLastClickTime(now);
        setIsDisabled(true);

        // Check profile completeness
        if (
            (!user?.skills || user.skills.length === 0) &&
            (!user?.experience || user.experience.length === 0) &&
            (!user?.description || user.description.length === 0)
        ) {
            setShowFillModal(true);
        } else {
            setShowCheckModal(true);
        }
    }, [isLoggedIn, hasCompletedOnboarding, lastClickTime, isDisabled, user, router, id]);

    const handleNotInterested = useCallback(() => {
        if (!isLoggedIn) {
            const returnUrl = encodeURIComponent(currentUrl);
            savePendingJobAction({ jobId: id, action: "ignore", returnUrl: currentUrl });
            router.push(`/login?returnUrl=${returnUrl}`);
            return;
        }

        if (!hasCompletedOnboarding) {
            const returnUrl = encodeURIComponent(currentUrl);
            router.push(`/onboarding?returnUrl=${returnUrl}`);
            return;
        }

        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime;

        if (timeSinceLastClick < 1000 || isDisabled) {
            return;
        }

        setLastClickTime(now);
        setIsDisabled(true);
        setDynamicApplicationStatus("ignored");

        jobMutation.mutate({ status: "ignore" });

        toast({
            title: "Status: Nemám zájem",
            duration: 3000,
        });
    }, [isLoggedIn, hasCompletedOnboarding, lastClickTime, isDisabled, router, toast, jobMutation, id]);

    const startAt = jobStartsAt ? new Date(jobStartsAt) : null;
    const endsAtDate = jobEndsAt ? new Date(jobEndsAt) : null;

    const startAtHour = startAt?.getHours();
    const startAtMinutes = startAt?.getMinutes();
    const endsAtHour = endsAtDate?.getHours();
    const endsAtMinutes = endsAtDate?.getMinutes();

    const normalizedSalaryType = salaryType === "hour" || salaryType === "total" || salaryType === "month"
        ? salaryType
        : undefined;
    const salaryString = getSalaryString({ salary, salaryTo, salaryType: normalizedSalaryType });
    const startDateString = getStartDateString({
        startsAt: jobStartsAt,
        endsAt: jobEndsAt,
        doesStartImmediately: doesStartImmediately || does_start_immediately,
    });

    const jobTypeLabel =
        term === "one_time"
            ? "JEDNORÁZOVÁ BRIGÁDA"
            : term === "long_term"
                ? "DLOUHODOBÁ BRIGÁDA"
                : "PLNÝ ÚVAZEK";

    // Badge colors matching production site
    const badgeBgColor =
        term === "one_time"
            ? "#2563eb" // blue-600
            : term === "long_term"
                ? "#2fbd68" // green-600
                : "#ca8a04"; // yellow-600

    const timeLeft = getJobEndAtDaysAndHours({
        offerExpiresAt: expiresAt,
    } as any);

    const timeLeftDaysNum = timeLeftDays || 0;
    const timeLeftHourNum = timeLeftHour || 0;

    const timeLeftText = `${timeLeftDaysNum ? timeLeftDaysNum : ""} ${timeLeftDaysNum && timeLeftDaysNum < JOB_VALIDITY_DAYS
        ? timeLeftDaysNum === 1
            ? "den"
            : timeLeftDaysNum > 1 && timeLeftDaysNum < 5
                ? "dny"
                : "dnů"
        : "dnů"
        } ${timeLeftHourNum} hod.`;

    // Use dynamic status if available, otherwise fall back to prop
    const currentApplicationStatus = dynamicApplicationStatus ?? applicationStatus;
    const currentEmployerStatement = dynamicEmployerStatement ?? employerStatement;

    return (
        <>
            {isDetail && (
                <ApplicationStatusProvider
                    jobId={id}
                    initialStatus={applicationStatus}
                    onStatusChange={setDynamicApplicationStatus}
                    applicationStatusResolvedOnServer={applicationStatusResolvedOnServer}
                />
            )}
            <ConditionalWrapper
                condition={!isDetail}
                wrapper={(children) => (
                    <NavigationLink
                        href={`/jobs/detail/${id}`}
                        className="block"
                        gaCategory="Job list"
                        gaAction="Open job detail"
                        gaLabel={String(id)}
                    >
                        {children}
                    </NavigationLink>
                )}
            >
                <Card
                    className={`transition-shadow hover:shadow-lg ${isInactive ? "opacity-70" : "opacity-100"
                        } ${currentApplicationStatus === "applied" || currentApplicationStatus === "accepted"
                            ? "border-2 border-green-500"
                            : currentApplicationStatus === "ignored"
                                ? "border-2 border-gray-400"
                                : currentApplicationStatus === "rejected"
                                    ? "border-2 border-red-500"
                                    : ""
                        }`}
                    style={{
                        minHeight: 500,
                        maxHeight: isDetail ? undefined : 500,
                    }}
                    itemScope
                    itemType="https://schema.org/JobPosting"
                >
                    <CardHeader>
                        {(currentApplicationStatus || currentEmployerStatement) && (
                            <div className="mb-4 flex flex-col gap-2">
                                {currentApplicationStatus && (
                                    <Badge
                                        className={`text-white text-sm sm:text-base font-semibold px-3 py-1.5 rounded-sm border-0 w-fit ${currentApplicationStatus === "applied" || currentApplicationStatus === "accepted"
                                            ? "bg-green-600"
                                            : currentApplicationStatus === "ignored"
                                                ? "bg-gray-500"
                                                : currentApplicationStatus === "rejected"
                                                    ? "bg-red-600"
                                                    : ""
                                            }`}
                                    >
                                        {currentApplicationStatus === "applied"
                                            ? "✓ Přihláška odeslána"
                                            : currentApplicationStatus === "accepted"
                                                ? "✓ Přijato"
                                                : currentApplicationStatus === "ignored"
                                                    ? "Nemám zájem"
                                                    : currentApplicationStatus === "rejected"
                                                        ? "Zamítnuto"
                                                        : ""}
                                    </Badge>
                                )}
                                {currentEmployerStatement && (
                                    <Badge
                                        className={`text-white text-sm sm:text-base font-semibold px-3 py-1.5 rounded-sm border-0 w-fit ${currentEmployerStatement === "employed"
                                            ? "bg-blue-600"
                                            : currentEmployerStatement === "invited_for_next_round"
                                                ? "bg-purple-600"
                                                : currentEmployerStatement === "rejected"
                                                    ? "bg-red-600"
                                                    : "bg-amber-600"
                                            }`}
                                    >
                                        {currentEmployerStatement === "waiting_for_response"
                                            ? "Zaměstnavatel zvažuje"
                                            : currentEmployerStatement === "saved"
                                                ? "Zaměstnavatel si vás uložil"
                                                : currentEmployerStatement === "invited_for_next_round"
                                                    ? "Pozváni do dalšího kola"
                                                    : currentEmployerStatement === "employed"
                                                        ? "Zaměstnán/a"
                                                        : currentEmployerStatement === "rejected"
                                                            ? "Odmítnuto zaměstnavatelem"
                                                            : ""}
                                    </Badge>
                                )}
                            </div>
                        )}
                        {isDetail && author && (
                            <div className="mb-6">
                                <div
                                    className="flex items-center gap-4 mb-4"
                                    itemProp="hiringOrganization"
                                    itemScope
                                    itemType="https://schema.org/Organization"
                                >
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage
                                            src={author.avatarImage?.url}
                                            alt={`Foto ${author.givenName || ""} ${author.familyName || ""}`.trim() || "Foto zaměstnavatele"}
                                        />
                                    </Avatar>
                                    <div className="flex flex-col gap-0" itemProp="name">
                                        <span className="font-medium">
                                            {`${author.givenName || ""} ${author.familyName || ""}`}
                                        </span>
                                        {!!author.rating && author.rating > 0 && author.rating !== null && (
                                            <CommentRatings
                                                variant='yellow'
                                                rating={author.rating}
                                                disabled
                                                size={20}
                                            />
                                        )}
                                    </div>
                                </div>
                                {author.description && (
                                    <p className="text-sm sm:text-base text-gray-600 mt-4" itemProp="description">
                                        {author.description}
                                    </p>
                                )}
                                <hr className="my-4 border-gray-200" />
                            </div>
                        )}

                        <meta itemProp="title" content={title || description} />

                        <Badge
                            className="text-white text-sm sm:text-base font-semibold px-3 py-1.5 rounded-sm mt-1 mb-8 w-fit border-0"
                            style={{ backgroundColor: badgeBgColor }}
                            itemProp="employmentType"
                        >
                            {jobTypeLabel}
                        </Badge>

                        <div className="flex flex-col gap-4">
                            {startAt ? (
                                <div className="flex items-center gap-2 mt-2" itemProp="jobStartDate">
                                    <span className="text-lg capitalize">
                                        {format(startAt, "EEEE, d. M.", { locale: cs })}
                                    </span>
                                    {startAtHour !== undefined &&
                                        endsAtHour !== undefined &&
                                        "/"}
                                    {startAtHour !== undefined &&
                                        endsAtHour !== undefined && (
                                            <span className="text-lg font-semibold">
                                                {`${String(startAtHour || 0).padStart(2, "0")}:${String(
                                                    startAtMinutes || 0
                                                ).padStart(2, "0")} - ${String(endsAtHour || 0).padStart(
                                                    2,
                                                    "0"
                                                )}:${String(endsAtMinutes || 0).padStart(2, "0")}`}
                                            </span>
                                        )}
                                </div>
                            ) : (
                                <>
                                    <meta itemProp="jobImmediateStart" content="True" />
                                    <p className="text-lg font-semibold text-gray-900 mb-2.5">
                                        Nástup co nejdříve
                                    </p>
                                </>
                            )}

                            {isDetail && description.includes("<") ? (
                                <div
                                    className="text-base text-gray-900 break-words [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold"
                                    dangerouslySetInnerHTML={{ __html: sanitizeJobHtml(description) }}
                                    itemProp="description"
                                />
                            ) : (
                                <p
                                    className={`text-base text-gray-900 whitespace-pre-wrap break-words ${isDetail
                                        ? ""
                                        : "line-clamp-8 max-h-[205px] overflow-hidden"
                                        }`}
                                    itemProp={isDetail ? "description" : undefined}
                                >
                                    {isDetail
                                        ? description
                                        : description.length > 200
                                            ? description.substring(0, 200) + "..."
                                            : description}
                                </p>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent>
                        {isDetail && benefits && (
                            <div className="mb-4">
                                <p className="text-sm sm:text-base text-gray-500 mb-2">Nabízíme</p>
                                <div
                                    className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed"
                                    itemProp="benefits"
                                >
                                    {benefits}
                                </div>
                            </div>
                        )}

                        {isDetail && requirements && requirements.length > 0 && term !== "one_time" && (
                            <div className="mb-4">
                                <p className="text-sm sm:text-base text-gray-500 mb-2">Požadavky</p>
                                <div className="flex flex-wrap gap-2" itemProp="skills">
                                    {requirements.map((feature, index) => (
                                        <div key={feature || index} className="flex items-center gap-2">
                                            <Check size={18} className="text-gray-600" strokeWidth={1.5} />
                                            <span className="text-sm sm:text-base">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isDetail && (
                            <div className="mb-5 flex flex-col gap-2">
                                {(timePeriod ?? time_period) != null && (timePeriod ?? time_period) !== "" ? (
                                    <p className="text-sm sm:text-base">
                                        {isIndefinitePeriod(timePeriod ?? time_period)
                                            ? "Na dobu neurčitou"
                                            : "Na dobu určitou"}
                                    </p>
                                ) : null}
                                {timeFlexibility || time_flexibility ? (
                                    <p className="text-sm sm:text-base">
                                        {isFlexibleTime(timeFlexibility ?? time_flexibility)
                                            ? "Flexibilní pracovní doba"
                                            : "Pevná pracovní doba"}
                                    </p>
                                ) : null}
                            </div>
                        )}

                        {stats?.appliedTotal != null && stats.appliedTotal > 0 && (
                            <div className="flex items-center gap-2 mb-3 bg-blue-50 rounded-lg px-3 py-2 w-fit">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold">
                                    {stats.appliedTotal}
                                </span>
                                <span className="text-sm text-gray-700">
                                    {stats.appliedTotal === 1 ? "zájemce se přihlásil" : stats.appliedTotal < 5 ? "zájemci se přihlásili" : "zájemců se přihlásilo"}
                                </span>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 mb-3 bg-red">
                            {place?.address && (
                                <div
                                    className="flex items-center gap-2.5"
                                    itemProp="jobLocation"
                                    itemScope
                                    itemType="https://schema.org/Place"
                                >
                                    <MapPin className="w-4 h-4 flex-shrink-0 text-green" />
                                    <div
                                        itemProp="address"
                                        itemScope
                                        itemType="https://schema.org/PostalAddress"
                                    >
                                        <p
                                            className="text-sm sm:text-base text-gray-900 whitespace-pre-wrap max-w-[470px]"
                                            itemProp="addressLocality"
                                        >
                                            {place.address}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {salaryString && (
                                <div className="flex items-center gap-2.5">
                                    <BanknoteIcon className="w-4 h-4 flex-shrink-0 text-green" />
                                    <div>
                                        <meta itemProp="salaryCurrency" content="CZK" />
                                        <meta itemProp="baseSalary" content={`${salary}`} />
                                        <p className="text-sm sm:text-base text-gray-900">{salaryString}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-2">
                        {!isInactive && !!expiresAt && (
                            <div className="w-full">
                                <div className="w-full bg-gray-200 rounded-full mb-2">
                                    <div
                                        className={`h-2 rounded-full transition-all ${progressColor}`}
                                        style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
                                        title="Čas do konce nabídky"
                                        aria-label="Čas do konce nabídky"
                                    />
                                </div>
                            </div>
                        )}

                        {isInactive && isDetail && (
                            <div className="flex items-center jstify-end gap-2 mt-4 w-full">
                                <meta
                                    itemProp="validThrough"
                                    content={expiresAt ? format(new Date(expiresAt), "yyyy-MM-dd") : ""}
                                />
                                <meta
                                    itemProp="datePosted"
                                    content={
                                        expiresAt
                                            ? format(
                                                new Date(
                                                    new Date(expiresAt).getTime() -
                                                    JOB_VALIDITY_DAYS * 24 * 60 * 60 * 1000
                                                ),
                                                "yyyy-MM-dd"
                                            )
                                            : ""
                                    }
                                />
                                <p className="text-sm sm:text-base text-blue-900 font-medium">
                                    Nabídka již není aktivní.
                                </p>
                            </div>
                        )}

                        {!isInactive && (
                            <div className="flex flex-col gap-2 w-full">
                                {!!expiresAt && (
                                    <div className="flex  justify-end gap-2 w-full">
                                        <meta
                                            itemProp="validThrough"
                                            content={format(new Date(expiresAt), "yyyy-MM-dd")}
                                        />
                                        <meta
                                            itemProp="datePosted"
                                            content={format(
                                                new Date(new Date(expiresAt).getTime() - JOB_VALIDITY_DAYS * 24 * 60 * 60 * 1000),
                                                "yyyy-MM-dd"
                                            )}
                                        />
                                        <p className="text-sm sm:text-base text-blue-900 font-medium">
                                            Nabídka končí za
                                        </p>
                                        <p className="text-sm sm:text-base font-bold">{timeLeftText}</p>
                                    </div>
                                )}
                                <div className="flex justify-between gap-4 w-full mt-4">
                                    {isExternal ? (
                                        <a
                                            href={externalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full"
                                            onClick={() => {
                                                if (typeof window !== "undefined" && (window as any).gtag) {
                                                    (window as any).gtag("event", "external_job_click", {
                                                        job_id: id,
                                                        feed_name: feedName ?? "external",
                                                    });
                                                }
                                            }}
                                        >
                                            <Button variant="default" size="lg" className="uppercase w-full">
                                                Reagovat na {feedName ?? "externím webu"}
                                            </Button>
                                        </a>
                                    ) : currentApplicationStatus === "applied" ? (
                                        <Button
                                            variant='default'
                                            size='lg'
                                            className="uppercase w-full bg-green-600 hover:bg-green-700 text-white"
                                            disabled={true}
                                        >
                                            ✓ Přihláška odeslána
                                        </Button>
                                    ) : currentApplicationStatus === "ignored" ? (
                                        <Button
                                            variant='outline'
                                            size='lg'
                                            className="uppercase w-full border-gray-400 text-gray-600"
                                            disabled={true}
                                        >
                                            Nemám zájem
                                        </Button>
                                    ) : currentApplicationStatus === "accepted" ? (
                                        <Button
                                            variant='default'
                                            size='lg'
                                            className="uppercase w-full bg-blue-600 hover:bg-blue-700 text-white"
                                            disabled={true}
                                        >
                                            ✓ Přijato
                                        </Button>
                                    ) : currentApplicationStatus === "rejected" ? (
                                        <Button
                                            variant='destructive'
                                            size='lg'
                                            className="uppercase w-full"
                                            disabled={true}
                                        >
                                            Zamítnuto
                                        </Button>
                                    ) : (
                                        <>
                                            {isLoggedIn && (
                                                <TrackedButton
                                                    variant='destructive'
                                                    size='lg'
                                                    className="uppercase w-full min-w-[130px]"
                                                    onClick={handleNotInterested}
                                                    disabled={isDisabled}
                                                    gaCategory="Job card"
                                                    gaAction="Nemám zájem"
                                                    gaLabel={String(id)}
                                                >
                                                    Nemám zájem
                                                </TrackedButton>
                                            )}
                                            <TrackedButton
                                                variant='default'
                                                size='lg'
                                                className="uppercase w-full min-w-[130px]"
                                                onClick={handleApply}
                                                disabled={isDisabled}
                                                gaCategory="Job card"
                                                gaAction="Mám zájem"
                                                gaLabel={String(id)}
                                            >
                                                Mám zájem
                                            </TrackedButton>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Fill Profile Modal */}
                        <Dialog open={showFillModal} onOpenChange={setShowFillModal}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Vyplňte nejprve svůj profil</DialogTitle>
                                    <DialogDescription>
                                        Pro přihlášení k nabídce je potřeba mít vyplněný profil.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowFillModal(false);
                                            setIsDisabled(false);
                                        }}
                                    >
                                        Zrušit
                                    </Button>
                                    <TrackedButton
                                        onClick={() => {
                                            setShowFillModal(false);
                                            router.push(`/profile/edit?returnUrl=${encodeURIComponent(currentUrl)}`);
                                        }}
                                        className="bg-primary"
                                        gaCategory="Job card"
                                        gaAction="Jít na profil"
                                        gaLabel="fill modal"
                                    >
                                        Jít na profil
                                    </TrackedButton>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Confirmation Modal */}
                        <Dialog open={showCheckModal} onOpenChange={(open) => { setShowCheckModal(open); if (!open) setIsDisabled(false); }}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Máš zájem o tuto nabídku?</DialogTitle>
                                    <DialogDescription className="mt-2">
                                        Odešleme tvůj profil s kontaktními údaji, aby se s tebou mohl zaměstnavatel spojit.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="flex-col-reverse sm:flex-row gap-3">
                                    <TrackedButton
                                        variant="outline"
                                        onClick={() => {
                                            setShowCheckModal(false);
                                            router.push("/");
                                        }}
                                        gaCategory="Job card"
                                        gaAction="Jít na profil"
                                        gaLabel="check modal"
                                    >
                                        ZKONTROLOVAT PROFIL
                                    </TrackedButton>
                                    <TrackedButton
                                        onClick={() => jobMutation.mutate({ status: "apply" })}
                                        className="bg-primary"
                                        gaCategory="Job card"
                                        gaAction="Mám zájem confirm"
                                        gaLabel={String(id)}
                                    >
                                        ANO, MÁM ZÁJEM
                                    </TrackedButton>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Success Modal */}
                        <Dialog open={showInterested} onOpenChange={setShowInterested}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Odesláno! ✅</DialogTitle>
                                    <DialogDescription className="mt-2">
                                        Tvůj životopis už míří ke správným lidem.
                                    </DialogDescription>
                                </DialogHeader>
                                <ShareButtons hideLabel jobId={id} description={description} className="mt-2 pt-0" />
                            </DialogContent>
                        </Dialog>


                    </CardFooter>
                </Card>
            </ConditionalWrapper>
        </>
    );
}
