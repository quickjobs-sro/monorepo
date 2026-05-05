"use client";

import Link from "next/link";
import { Filter, Edit2 } from "lucide-react";
import { Badge } from "@ui/components/core/badge";
import { cn } from "@ui/lib/utils";
import { JOB_TYPE_BADGE_COLORS } from "../lib/jobHelpers";

export type JobTypeKey = "oneTime" | "longTerm" | "fulltime";

const LABELS: Record<JobTypeKey, string> = {
    oneTime: "JEDNORÁZOVÉ BRIGÁDY",
    longTerm: "DLOUHODOBÉ BRIGÁDY",
    fulltime: "PLNÉ ÚVAZKY",
};

/** Same hex as job cards (from jobHelpers) - used for preferences/editable when Tailwind arbitrary value is ok */
const ACTIVE_COLORS: Record<JobTypeKey, string> = {
    oneTime: "bg-[#2563eb]",
    longTerm: "bg-[#2fbd68]",
    fulltime: "bg-[#ca8a04]",
};

const INACTIVE_COLOR = "bg-gray-500";

export interface JobTypeBadgesProps {
    activeOneTime?: boolean;
    activeLongTerm?: boolean;
    activeFulltime?: boolean;
    variant: "filter" | "preferences" | "editable";
    className?: string;
    /** Prefer editHref for navigation so Link works (middle-click, etc.). Falls back to onEdit. */
    editHref?: string;
    onEdit?: () => void;
    /** When set, each badge is clickable and toggles that type (saves from parent). */
    onToggle?: (type: JobTypeKey) => void;
    /** When toggling, show loading on the badge (e.g. one of "oneTime" | "longTerm" | "fulltime"). */
    togglingType?: JobTypeKey | null;
    /** When true, the last active badge cannot be turned off (min 1 type required). */
    disableToggleOffWhenLast?: boolean;
    /** Filter variant: which type is selected (null = show all, all badges colored). */
    selectedFilter?: JobTypeKey | null;
    /** Filter variant: when set, badges are clickable to filter the list. */
    onFilterClick?: (type: JobTypeKey) => void;
}

export const JobTypeBadges = ({
    activeOneTime = false,
    activeLongTerm = false,
    activeFulltime = false,
    variant,
    className,
    editHref,
    onEdit,
    onToggle,
    togglingType,
    disableToggleOffWhenLast = false,
    selectedFilter,
    onFilterClick,
}: JobTypeBadgesProps) => {
    const canEdit = !!(editHref || onEdit);
    const isEditable = variant === "editable" || !!onToggle;
    const isFilterClickable = variant === "filter" && !!onFilterClick;

    const badgeClass = (active: boolean, key: JobTypeKey) =>
        cn(
            "uppercase text-white text-xs font-semibold px-3 py-1 rounded-md border-0",
            active ? ACTIVE_COLORS[key] : INACTIVE_COLOR,
            (isEditable || isFilterClickable) && "cursor-pointer hover:opacity-90 transition-opacity"
        );

    const badges = (
        <div className="flex flex-wrap items-center gap-3 py-2">
            {isFilterClickable && onFilterClick ? (
                <>
                    {(["oneTime", "longTerm", "fulltime"] as const).map((key) => {
                        const isSelected = selectedFilter === key;
                        const active =
                            key === "oneTime" ? activeOneTime : key === "longTerm" ? activeLongTerm : activeFulltime;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => onFilterClick(key)}
                                className={cn(
                                    badgeClass(active, key),
                                    "whitespace-nowrap shrink-0",
                                    isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background"
                                )}
                            >
                                {LABELS[key]}
                            </button>
                        );
                    })}
                </>
            ) : isEditable && onToggle ? (() => {
                const activeCount = [activeOneTime, activeLongTerm, activeFulltime].filter(Boolean).length;
                const isLastActive = (key: JobTypeKey) =>
                    disableToggleOffWhenLast &&
                    activeCount <= 1 &&
                    (key === "oneTime" ? activeOneTime : key === "longTerm" ? activeLongTerm : activeFulltime);
                return (
                    <>
                        {(["oneTime", "longTerm", "fulltime"] as const).map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => onToggle(key)}
                                disabled={togglingType != null || isLastActive(key)}
                                className={cn(
                                    badgeClass(
                                        key === "oneTime" ? activeOneTime : key === "longTerm" ? activeLongTerm : activeFulltime,
                                        key
                                    ),
                                    togglingType === key && "opacity-70",
                                    isLastActive(key) && "cursor-not-allowed opacity-80"
                                )}
                            >
                                {LABELS[key]}
                            </button>
                        ))}
                    </>
                );
            })() : (
                <>
                    <Badge className={badgeClass(activeOneTime, "oneTime")}>{LABELS.oneTime}</Badge>
                    <Badge className={badgeClass(activeLongTerm, "longTerm")}>{LABELS.longTerm}</Badge>
                    <Badge className={badgeClass(activeFulltime, "fulltime")}>{LABELS.fulltime}</Badge>
                </>
            )}
        </div>
    );

    if (variant === "filter") {
        return (
            <div className={cn(className)}>
                <div className="flex flex-wrap items-center gap-3 py-2">
                    {(["oneTime", "longTerm", "fulltime"] as const).map((key) => {
                        const isSelected = selectedFilter === key;
                        const active =
                            key === "oneTime" ? activeOneTime : key === "longTerm" ? activeLongTerm : activeFulltime;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => onFilterClick?.(key)}
                                className={cn(
                                    badgeClass(active, key),
                                    "whitespace-nowrap shrink-0",
                                    isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background"
                                )}
                            >
                                {LABELS[key]}
                            </button>
                        );
                    })}

                </div>
            </div>
        );
    }

    if (variant === "editable") {
        return (
            <div className={cn("space-y-2", className)}>
                <h3 className="text-[#002d48] text-sm sm:text-md font-medium underline">
                    Zajímají mě
                </h3>
                {badges}
            </div>
        );
    }

    const editContent = (
        <>
            <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[#002d48] text-sm sm:text-md font-medium underline">
                    Zajímají mě
                </h3>
                {canEdit &&
                    (editHref ? (
                        <Link
                            href={editHref}
                            className="text-[#2fbd68] hover:text-green-600 transition-colors cursor-pointer"
                            aria-label="Upravit typ nabídky"
                        >
                            <Edit2 className="h-4 w-4" />
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onEdit?.();
                            }}
                            className="text-[#2fbd68] hover:text-green-600 transition-colors cursor-pointer bg-transparent border-0 p-0"
                            aria-label="Upravit typ nabídky"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                    ))}
            </div>
            {onToggle ? (
                badges
            ) : canEdit && editHref ? (
                <Link
                    href={editHref}
                    className="block text-left w-full rounded focus:outline-none focus:ring-2 focus:ring-green-500/30 cursor-pointer"
                >
                    {badges}
                </Link>
            ) : canEdit && onEdit ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="text-left w-full rounded focus:outline-none focus:ring-2 focus:ring-green-500/30 cursor-pointer bg-transparent border-0 p-0"
                >
                    {badges}
                </button>
            ) : (
                badges
            )}
        </>
    );

    return (
        <div className={cn("flex flex-col sm:flex-row sm:space-x-4 mt-3 sm:mt-4", className)}>
            <div className="hidden sm:block w-0 sm:w-16 md:w-20" />
            <div className="flex-1">{editContent}</div>
        </div>
    );
};
