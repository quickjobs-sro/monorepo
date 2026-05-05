"use client";
import { Skeleton } from "@ui/components/core/skeleton";
import { Toaster } from "@ui/components/core/toaster";
import { useGetPendingReviews } from "@ui/hooks/useGetPendingReviews";
import { Application, Job } from "quickjobs-api-wrapper";
import { useMemo } from "react";
import { ReviewItem } from "./ReviewItem";

type ReviewListItem = {
  job?: Job;
  review?: any;
  application?: Application;
  user?: any;
};

const ReviewItemSkeleton = () => {
  return (
    <div className="flex flex-row gap-4 border border-gray-200 rounded-lg p-6">
      <div className="flex flex-row gap-4 items-start">
        <div className="w-[330px] flex flex-col gap-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        <div className="flex flex-row gap-2 items-center">
          <Skeleton className="size-[70px] rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      <div className="flex ml-8 flex-col gap-2 justify-start flex-1">
        <Skeleton className="h-4 w-32 ml-1" />

        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="size-6 rounded-sm" />
          ))}
        </div>

        <div className="flex flex-row gap-2 mt-2 justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
};

export const ReviewFeature = () => {
  const { data, isLoading } = useGetPendingReviews();

  const ReviewList = useMemo(() => {
    const jobs = data?.jobs;
    const pendingReviews = data?.pendingReviews;
    const applications = data?.applications;
    const users = data?.users;

    return pendingReviews?.map((pendingReview: any) => {
      const job = jobs?.find((job: Job) => job.id === pendingReview.jobId);
      const application = applications?.find(
        (application: Application) => application.jobId === pendingReview.jobId
      );
      const user = users?.find(
        (user: any) => user.id === pendingReview.candidateId
      );

      return {
        job,
        review: pendingReview,
        application,
        user,
      };
    });
  }, [data]);

  return (
    <div>
      <Toaster />
      {isLoading ? (
        <div className="flex flex-col gap-6 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-500">
              Nevyřízené hodnocení
            </h2>
            <Skeleton className="h-6 w-8" />
          </div>
          {Array.from({ length: 3 }).map((_, index) => (
            <ReviewItemSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6 border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-500">
            Nevyřízená hodnocení ({ReviewList?.length})
          </h2>
          {ReviewList?.filter((item: ReviewListItem) => item.job).length ===
            0 && (
            <div className="flex flex-col gap-2">
              <p className="text-gray-500">
                Zde budete moci hodnotit uživatele.
              </p>
            </div>
          )}
          {ReviewList?.filter((item: ReviewListItem) => item.job).map(
            (item: ReviewListItem) => (
              <ReviewItem key={item.job!.id} {...item} job={item.job!} />
            )
          )}
        </div>
      )}
    </div>
  );
};
