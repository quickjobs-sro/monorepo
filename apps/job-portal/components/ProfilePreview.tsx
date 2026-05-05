"use client";

import { useMemo } from "react";
import { Edit2 } from "lucide-react";
import { getAge } from "@ui/helpers/getAge";
import { getUpdatedDate } from "@ui/helpers/getUpdatedDate";
import { getSchoolStatusString } from "@ui/helpers/getSchoolStatusString";
import { cn } from "@ui/lib/utils";
import { Badge } from "@ui/components/core/badge";
import { JobTypeBadges, type JobTypeKey } from "./JobTypeBadges";
import { Card, CardContent } from "@ui/components/core/card";
import { CommentRatings } from "@ui/components/core/rating";
import { UserAvatar } from "@ui/components/userAvatar";
import { SkillsPreview } from "@ui/components/SkillsPreview";
import ReviewCarousel from "@ui/components/ReviewCaousel";
import { Circle } from "lucide-react";
import { getSubscribedJobTypes } from "../lib/subscribedJobTypes";

interface ProfilePreviewProps {
    user: {
        givenName?: string;
        familyName?: string;
        description?: string;
        updatedAt?: string;
        birthDate?: string;
        skills?: string[];
        experience?: Array<{ title: string; companyName: string }>;
        rating?: number;
        ratingCount?: number;
        subscribedNotifications?: any;
        userSchools?: Array<{
            id: number;
            school: { id: number; name: string; city?: string };
            schoolFaculty?: { name: string };
            status: string;
            otherText?: string;
        }>;
        areas?: Array<{
            id: number;
            place?: { address: string };
        }>;
        avatarImage?: { url?: string };
        bodyImage?: { url?: string };
        faceImage?: { url?: string };
        optionalImage?: { url?: string };
        reviews?: any[];
    };
    isExampleProfile?: boolean;
    showEditButtons?: boolean;
    onEditName?: () => void;
    onEditEducation?: () => void;
    onEditExperience?: () => void;
    onEditSkills?: () => void;
    onEditLocation?: () => void;
    onEditJobTypes?: () => void;
    /** When set, "Zajímají mě" edit uses Link to this href (recommended for reliable navigation). */
    editJobTypesHref?: string;
    /** When set, clicking a badge toggles that subscription and saves (profile view). */
    onToggleJobType?: (type: JobTypeKey) => void;
    togglingJobType?: JobTypeKey | null;
}

export const ProfilePreview = ({
    user,
    isExampleProfile = false,
    showEditButtons = true,
    onEditName,
    onEditEducation,
    onEditExperience,
    onEditSkills,
    onEditLocation,
    onEditJobTypes,
    editJobTypesHref,
    onToggleJobType,
    togglingJobType,
}: ProfilePreviewProps) => {
    const {
        givenName,
        familyName,
        description,
        updatedAt,
        birthDate,
        skills,
        experience,
        rating,
        ratingCount,
        subscribedNotifications,
        userSchools,
        areas,
        reviews,
    } = user;

    const hasAvatar = !!user.avatarImage?.url;
    const subscribedJobTypes = getSubscribedJobTypes(subscribedNotifications);

    const renderEducation = () => {
        const hasSchools = userSchools && userSchools.length > 0;

        return (
            <div className="flex items-start gap-2">
                <div className="flex-1">
                    <div className="flex items-center gap-1 sm:gap-2 mb-2">
                        <h3 className="text-[#002d48] text-sm sm:text-md font-medium underline">
                            Vzdělání
                        </h3>
                        {showEditButtons && onEditEducation && (
                            <button
                                onClick={onEditEducation}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                aria-label="Upravit vzdělání"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {hasSchools ? (
                        <div>
                            {userSchools.map((item) => (
                                <div key={item.id} className="pb-2 pr-10">
                                    <p className="text-[#002d48] text-sm">
                                        <strong>
                                            {item.school.id === 1465
                                                ? item.otherText || "Nevyplněná škola"
                                                : item.school.name}
                                        </strong>{" "}
                                        {item.schoolFaculty && `(${item.schoolFaculty?.name})`}{" "}
                                        {item.school.city && `(${item.school.city})`} -{" "}
                                        {getSchoolStatusString(item.status)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Žádné vzdělání</p>
                    )}
                </div>
            </div>
        );
    };

    const renderExperience = () => {
        const hasExperience = experience && experience.length > 0;

        return (
            <div className="flex items-start gap-2">
                <div className="flex-1">
                    <div className="flex items-center gap-1 sm:gap-2 mb-2">
                        <h3 className="text-[#002d48] text-sm sm:text-md font-medium underline">
                            Zkušenosti
                        </h3>
                        {showEditButtons && onEditExperience && (
                            <button
                                onClick={onEditExperience}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                aria-label="Upravit zkušenosti"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {hasExperience ? (
                        <div className="w-full">
                            {experience.map((item, index) => (
                                <div key={index} className="pb-2 pr-10">
                                    <p className="text-[#002d48] text-sm">
                                        <strong>{item.title}</strong> - {item.companyName}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Žádné zkušenosti</p>
                    )}
                </div>
            </div>
        );
    };

    const renderSkills = () => {
        const hasSkills = skills && skills.length > 0;

        return (
            <div className="flex items-start gap-2">
                <div className="flex-1">
                    <div className="flex items-center gap-1 sm:gap-2 mb-2">
                        <h3 className="text-[#002d48] text-sm sm:text-md font-medium underline">
                            Dovednosti
                        </h3>
                        {showEditButtons && onEditSkills && (
                            <button
                                onClick={onEditSkills}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                aria-label="Upravit dovednosti"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {hasSkills ? (
                        <div className="flex flex-row">
                            <div>
                                {skills.map((skill, index) => (
                                    <div key={index} className="pb-2">
                                        <p className="text-[#002d48] flex items-center text-sm">
                                            <Circle
                                                className="text-emerald-500 mr-1"
                                                size={8}
                                                fill="#58ce88"
                                            />
                                            {skill}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Žádné dovednosti</p>
                    )}
                </div>
            </div>
        );
    };

    const renderAreas = () => {
        const hasAreas = areas && areas.length > 0;

        return (
            <div className="flex items-start gap-2">
                <div className="flex-1">
                    <div className="flex items-center gap-1 sm:gap-2 mb-2">
                        <h3 className="text-[#002d48] text-sm sm:text-md font-medium underline">
                            Lokace
                        </h3>
                        {showEditButtons && onEditLocation && (
                            <button
                                onClick={onEditLocation}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                aria-label="Upravit lokaci"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {hasAreas ? (
                        <div>
                            {areas.map((area) => (
                                <div key={area.id} className="pb-2">
                                    <p className="text-[#002d48] text-sm">
                                        {area.place?.address || "Neznámá adresa"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Žádná lokace</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Card className="border-none shadow-none pr-0 sm:pr-8 md:pr-20 pt-4">
            <CardContent className="border-b border-gray-200 p-0 pb-4">
                <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0 mt-2">
                        <UserAvatar
                            isLoading={false}
                            showName={false}
                            avatarProps={{
                                className: "size-[60px] sm:size-[70px]",
                            }}
                            {...(user as any)}
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-row gap-1 items-center flex-wrap">
                            <div className="flex items-center gap-1 sm:gap-2">
                                <h3 className="text-lg sm:text-xl font-medium text-emerald-500">
                                    {givenName} {familyName}
                                </h3>
                                {showEditButtons && onEditName && (
                                    <button
                                        onClick={onEditName}
                                        className="text-gray-500 hover:text-gray-700 transition-colors"
                                        aria-label="Upravit jméno"
                                    >
                                        <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </button>
                                )}
                            </div>

                            {birthDate && (
                                <span className="text-base sm:text-lg font-medium text-emerald-500">
                                    ({getAge(birthDate)} let)
                                </span>
                            )}
                            {rating ? (
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <CommentRatings
                                        rating={rating || 0}
                                        totalStars={5}
                                        size={20}
                                        variant="yellow"
                                        disabled
                                    />
                                    <span className="text-[#002d48] font-medium text-xs sm:text-sm md:text-base">
                                        {rating.toFixed(1)}
                                    </span>
                                    <span className="text-[#002d4870] text-xs sm:text-sm">({ratingCount})</span>
                                </div>
                            ) : null}
                        </div>

                        {description && (
                            <p className="text-[#002d48] pb-3 sm:pb-4 pt-2 max-w-[900px] text-xs sm:text-sm">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="w-full pt-3 sm:pt-4">
                    <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                        <div className="flex flex-col w-full pl-0 sm:pl-16 md:pl-24 pr-0 sm:pr-4 md:pr-10 space-y-4">
                            {renderExperience()}
                            {renderEducation()}
                            {renderAreas()}
                        </div>
                        <div className="w-full md:w-2/5 pl-0 md:pl-0">
                            {renderSkills()}
                        </div>
                    </div>
                </div>

                {reviews && reviews.length > 0 && (
                    <div className="pt-4">
                        <ReviewCarousel reviews={reviews} />
                    </div>
                )}

                <JobTypeBadges
                    variant="preferences"
                    activeOneTime={subscribedJobTypes.includes("newOneTimeJobs")}
                    activeLongTerm={subscribedJobTypes.includes("newLongTermJobs")}
                    activeFulltime={subscribedJobTypes.includes("newFullTimeJobs")}
                    onToggle={onToggleJobType}
                    togglingType={togglingJobType}
                    disableToggleOffWhenLast={!!onToggleJobType}
                />

                {updatedAt && (
                    <div className="flex flex-col sm:flex-row sm:space-x-4 mt-2">
                        <div className="hidden sm:block w-0 sm:w-16 md:w-20"></div>
                        <p className="text-gray-400 text-xs sm:text-sm pl-0 sm:pl-0">
                            Poslední aktualizace profilu: {getUpdatedDate(updatedAt)}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
