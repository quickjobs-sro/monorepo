import { Button } from "@ui/components/core/button";
import { Input } from "@ui/components/core/input";
import { CommentRatings } from "@ui/components/core/rating";
import { ImageDialog } from "@ui/components/dialogs/ImageDialog";
import { UserAvatar } from "@ui/components/userAvatar";
import { API } from "@ui/hooks";
import { useToast } from "@ui/hooks/use-toast";
import { cn } from "@ui/lib/utils";
import { queryClient } from "@ui/Providers/ServerProvider";
import { API_KEYS } from "@ui/types/api_keys";
import { Loader2 } from "lucide-react";
import {
  Application,
  Job,
  PrivateUserProfile,
  Review,
} from "quickjobs-api-wrapper";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HistoryJobItem } from "../MyJobs/HistoryJobItem";

type ReviewItemProps = {
  job: Job;
  review?: Review;
  application?: Application;
  user?: PrivateUserProfile;
};

type ReviewFormData = {
  rating: number;
  comment: string;
};

export const ReviewItem = ({
  job,
  review,
  application,
  user,
}: ReviewItemProps) => {
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const avatarUrl = user?.avatarImage?.url;
  const { toast } = useToast();
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReviewFormData>({
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const watchedComment = watch("comment");
  const watchedRating = watch("rating");

  const submitReview = async (
    rating: number,
    message: string,
    setLoading: (loading: boolean) => void
  ) => {
    setLoading(true);
    try {
      await API.reviews.addReviewCandidate(application?.id!, {
        rating,
        message,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [API_KEYS.PENDING_REVIEWS],
        }),
        queryClient.refetchQueries({
          queryKey: [API_KEYS.PENDING_REVIEWS],
        }),
      ]);

      toast({
        title: "Hodnocení odesláno",
        description: "Děkujeme za hodnocení",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Nastala chyba při odesílání hodnocení",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ReviewFormData) => {
    await submitReview(data.rating, data.comment, setIsSubmitting);
  };

  const handleRatingChange = (rating: number) => {
    setValue("rating", rating);
    setShowInput(true);
  };

  return (
    <div className="flex flex-row gap-10 border border-gray-200 rounded-lg p-6 transition-all duration-300 hover:shadow-md hover:border-gray-300">
      <div className="flex flex-row gap-4 items-start">
        <div className="w-[430px]">
          <div className="flex flex-col gap-2">
            <div
              className={cn(
                "cursor-pointer transition-transform duration-200 hover:scale-105 mb-6",
                !avatarUrl && "pointer-events-none"
              )}
              onClick={() => setIsImageDialogOpen(true)}
            >
              <UserAvatar
                isLoading={false}
                avatarProps={{
                  className:
                    "size-[70px] transition-all duration-200 hover:ring-2 hover:ring-primary/20",
                }}
                nameProps={{
                  className: "text-gray-600 text-lg font-semibold ml-4",
                }}
                {...user}
              />
            </div>
          </div>
          <HistoryJobItem historyJob={job} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-2 justify-start flex-1"
      >
        <p className="ml-1 text-gray-500 text-md font-bold">
          Ohodnoťte uchazeče
        </p>

        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <CommentRatings
              rating={field.value}
              totalStars={5}
              size={40}
              variant="yellow"
              onRatingChange={(rating) => {
                field.onChange(rating);
                handleRatingChange(rating);
              }}
            />
          )}
        />

        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            showInput
              ? "max-h-32 opacity-100 transform translate-y-0"
              : "max-h-0 opacity-0 transform -translate-y-2"
          )}
        >
          {showInput && (
            <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col gap-1">
                <Controller
                  name="comment"
                  control={control}
                  rules={{
                    maxLength: {
                      value: 150,
                      message: "Hodnocení může mít maximálně 150 znaků",
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      maxLength={150}
                      placeholder="Napište hodnocení (spolehlivost, proaktivita, pracovní výkon atd.)"
                      error={errors.comment?.message}
                      className="transition-all duration-200 "
                    />
                  )}
                />
                <span className="text-xs text-gray-500 text-right">
                  {watchedComment?.length || 0} / 150
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-row gap-2 mt-2 justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={isSkipping || isSubmitting}
            className="text-xs text-emerald-500 transition-colors duration-200 hover:text-emerald-600 hover:bg-transparent px-0 disabled:opacity-50"
            onClick={async () => {
              await submitReview(0, "", setIsSkipping);
            }}
          >
            {isSkipping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Odesílání...
              </>
            ) : (
              "Nehodnotit, spolupráce se neuskutečnila"
            )}
          </Button>

          <div
            className={cn(
              "transition-all duration-300 ease-in-out",
              "opacity-100 transform translate-x-0"
            )}
          >
            <Button
              disabled={watchedComment.length < 5 || isSubmitting || isSkipping}
              type="submit"
              variant="default"
              className="animate-in slide-in-from-right-2 duration-300 transition-all hover:scale-105 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Odesílání...
                </>
              ) : (
                "Odeslat hodnocení"
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Image Dialog */}
      {avatarUrl && (
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
    </div>
  );
};
