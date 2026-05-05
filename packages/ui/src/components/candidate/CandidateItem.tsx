import { useQueryClient } from "@tanstack/react-query";
import API, { Application, CandidateUserProfile } from "quickjobs-api-wrapper";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { getAge, getSubscribedJobTypes, getUpdatedDate } from "../../helpers";
import { cn } from "../../lib/utils";
import { Badge } from "../core/badge";
import { Card, CardContent } from "../core/card";
import { CommentRatings } from "../core/rating";
import { FormValues, statusOptions } from "../dialogs/ContactCandidateDialog";
import { ImageDialog } from "../dialogs/ImageDialog";
import ReviewCarousel from "../ReviewCaousel";
import { SkillsPreview } from "../SkillsPreview";
import { UserAvatar } from "../userAvatar";
import { CandidateItemButton } from "./CandidateItemButton";

export const variantClasses = {
  primary: "text-blue-600 border-blue-600",
  destructive: "text-red-600 border-red-600",
  secondary: "text-sky-600 border-sky-600",
  success: "text-green border-green",
  default: "text-[#002d48] border-gray-300",
};

export const CandidatesItem = ({
  user,
  application,
  jobStatus,
}: {
  user: Partial<CandidateUserProfile> & Partial<Application>;
  application: Application;
  jobStatus?: string;
}) => {
  const queryClient = useQueryClient();
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

  if (!user) {
    return null;
  }

  const hasAvatar = !!user.avatarImage?.url;
  const avatarUrl = user.avatarImage?.url;

  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      status: user.employerStatement as FormValues["status"],
      note: user.note || "",
    },
  });
  const note = watch("note");
  const status = watch("status");

  const onSubmit = handleSubmit(async (data) => {
    if (data.status) {
      try {
        const reactionData = {
          agreedAt: new Date().toISOString(),
          calledAt: new Date().toISOString(),
          callLength: 0,
        };

        await API.applications.resolveApplication(
          application.id,
          data.status,
          reactionData
        );

        await queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      } catch (e) {
        console.error("Error resolving application:", e);
      }
    }

    if (data.note !== undefined) {
      try {
        await API.applications.updateApplication(application.id, {
          note: data.note || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      } catch (e) {
        console.error("Error updating note:", e);
      }
    }
  });

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
    candidateStatus,
    employerStatement,
  } = user;

  const matchedStatus = useMemo(() => {
    return statusOptions.find((s) => {
      if (s.value === status) {
        return true;
      }
      if (s.employedStatus === status) {
        return true;
      }
      if (!status && s.employedStatus === application.employerStatement) {
        return true;
      }
      return false;
    });
  }, [status, application.employerStatement]);

  const matchStatusLabel = useMemo(() => {
    return matchedStatus?.label;
  }, [matchedStatus]);

  const subscribedJobTypes = getSubscribedJobTypes(subscribedNotifications);
  return (
    <Card className="border-none shadow-none pr-20 pt-4">
      <CardContent className="border-b border-gray-200 p-0 pb-4">
        <div className="flex items-start space-x-4">
          <div
            className={cn(
              "cursor-pointer flex-shrink-0 mt-2",
              !hasAvatar && "pointer-events-none"
            )}
            onClick={() => setIsImageDialogOpen(true)}
          >
            <UserAvatar
              isLoading={false}
              showName={false}
              avatarProps={{
                className: "size-[70px]",
              }}
              {...user}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-row gap-1 items-center flex-wrap">
              <h3 className="text-xl font-medium text-emerald-500">
                {givenName} {familyName}
              </h3>

              {birthDate && (
                <span className={cn("text-lg font-medium text-emerald-500")}>
                  ({getAge(birthDate)} let)
                </span>
              )}
              {rating ? (
                <div className="flex items-center gap-2">
                  <CommentRatings
                    rating={rating || 0}
                    totalStars={5}
                    size={24}
                    variant="yellow"
                    disabled
                  />
                  <span className="text-[#002d48] font-medium">
                    {rating.toFixed(1)}
                  </span>
                  <span className="text-[#002d4870]">({ratingCount})</span>
                </div>
              ) : null}
              {matchStatusLabel && (
                <span
                  className={cn(
                    "font-medium text-sm rounded-full px-2 border mt-1 ml-2",
                    matchedStatus
                      ? variantClasses[
                      matchedStatus.variant as keyof typeof variantClasses
                      ] || variantClasses.default
                      : variantClasses.default
                  )}
                >
                  {matchStatusLabel}
                </span>
              )}

              <CandidateItemButton
                user={user}
                application={application}
                applicationId={application.id}
                register={register}
                watch={watch}
                setValue={setValue}
                onSubmit={onSubmit}
                jobStatus={jobStatus}
              />
            </div>

            {note && (
              <p className="text-[#002d48] text-xs p-2 mb-4 bg-gray-200 rounded-xl mt-4 max-w-[700px]">
                {application.note || note}
              </p>
            )}

            {description && (
              <p className="text-[#002d48] pb-4 pt-2 max-w-[900px] text-sm">
                {description}
              </p>
            )}
          </div>
        </div>

        <SkillsPreview {...user} />
        <ReviewCarousel reviews={reviews || []} />

        <div className="flex space-x-4 mt-4">
          <div className="w-20"></div>
          <div className="flex space-x-2 text-white uppercase font-medium items-center">
            <p className="text-sm text-gray-400 normal-case">Mám zájem o</p>
            {subscribedJobTypes.includes("newOneTimeJobs") && (
              <Badge className="bg-blue pointer-events-none">
                jednorázovou brigádu
              </Badge>
            )}
            {subscribedJobTypes.includes("newLongTermJobs") && (
              <Badge className="bg-green pointer-events-none">
                dlouhodobou brigádu
              </Badge>
            )}
            {subscribedJobTypes.includes("newFullTimeJobs") && (
              <Badge className="bg-yellow-500 pointer-events-none">
                plný úvazek
              </Badge>
            )}
          </div>
        </div>

        <div className="flex space-x-4 mt-2">
          <div className="w-20"></div>
          {updatedAt && (
            <p className="text-gray-400 text-sm">
              Poslední aktualizace profilu: {getUpdatedDate(updatedAt)}
            </p>
          )}
        </div>
      </CardContent>

      {hasAvatar && avatarUrl && (
        <ImageDialog
          isOpen={isImageDialogOpen}
          setIsOpen={setIsImageDialogOpen}
          images={
            [
              avatarUrl,
              user?.bodyImage?.url,
              user?.faceImage?.url,
              user?.optionalImage?.url,
            ].filter(Boolean) as string[]
          }
        />
      )}
    </Card>
  );
};
