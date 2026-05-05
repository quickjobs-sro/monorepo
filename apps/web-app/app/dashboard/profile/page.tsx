"use client";

import { CommentRatings } from "@ui/components/core/rating";
import { Skeleton } from "@ui/components/core/skeleton"; // For loading states
import type { ProfileImage } from "@ui/components/profile/ProfileImageManager";
import { ProfileImageManager } from "@ui/components/profile/ProfileImageManager";
import { UserInfoSection } from "@ui/components/profile/UserInfoSection";
import ReviewCarousel from "@ui/components/ReviewCaousel"; // Assuming this is the correct path
import { TryAgain } from "@ui/components/TryAgain";
import { useGetProfile } from "@ui/hooks/useGetProfile";
import { useGetReview } from "@ui/hooks/useGetReview";

import { useMemo } from "react";

export default function ProfilePage() {
  const { data: userProfile, isLoading, error, refetch } = useGetProfile();
  const { data: reviews } = useGetReview();

  const finalDisplayImages: ProfileImage[] = useMemo(() => {
    const images: ProfileImage[] = [];
    const data = userProfile?.data;

    // 1. Avatar Image
    if (data?.avatarImage?.url) {
      images.push({
        id: "avatar",
        url: data.avatarImage.url,
        alt: "Hlavní profilový obrázek",
        isMain: true,
      });
    } else {
      images.push({
        id: "main-placeholder",
        url: "",
        alt: "Nahrát hlavní obrázek",
        isMain: true,
      });
    }
    // 2. Body Image
    if (data?.bodyImage?.url) {
      images.push({
        id: "body",
        url: data.bodyImage.url,
        alt: "Obrázek těla",
        isMain: false,
      });
    } else {
      images.push({
        id: "body-placeholder",
        url: "",
        alt: "Nahrát obrázek těla",
        isMain: false,
      });
    }
    // 3. Face Image
    if (data?.faceImage?.url) {
      images.push({
        id: "face",
        url: data.faceImage.url,
        alt: "Obrázek obličeje",
        isMain: false,
      });
    } else {
      images.push({
        id: "face-placeholder",
        url: "",
        alt: "Nahrát obrázek obličeje",
        isMain: false,
      });
    }
    // 4. Optional Image
    if (data?.optionalImage?.url) {
      images.push({
        id: "optional",
        url: data.optionalImage.url,
        alt: "Doplňkový obrázek",
        isMain: false,
      });
    } else {
      images.push({
        id: "optional1-placeholder",
        url: "",
        alt: "Nahrát doplňkový obrázek",
        isMain: false,
      });
    }
    return images;
  }, [userProfile?.data]);

  const userInfoDefaultValues = useMemo(() => {
    const data = userProfile?.data;
    return {
      givenName: data?.givenName || "",
      familyName: data?.familyName || "",
      email: data?.email || "",
      description: data?.description || "",
      phone: data?.phone || "",
    };
  }, [userProfile?.data]);

  const mappedReviews = useMemo(() => {
    const data = reviews?.reviews;
    const reviewsArray = Array.isArray(data) ? data : [];
    return reviewsArray.map((review: any) => ({
      id: review.id,
      message: review.message || review.comment,
      value: review.rating || review.score,
    }));
  }, [reviews]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-8 space-y-12 animate-pulse">
        {/* Skeleton for Profile Images Section */}
        <section>
          <Skeleton className="h-8 w-3/4 mb-6" />{" "}
          {/* Heading: Vaše profilové fotografie */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </section>

        {/* Skeleton for User Information Section */}
        <section>
          <Skeleton className="h-8 w-1/2 mb-6" /> {/* Heading: Osobní údaje */}
          <div className="bg-white p-6 shadow rounded-lg space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-4 w-1/4 mb-1" /> {/* Label */}
                <Skeleton className="h-10 w-full rounded-md" /> {/* Input */}
              </div>
              <div>
                <Skeleton className="h-4 w-1/4 mb-1" /> {/* Label */}
                <Skeleton className="h-10 w-full rounded-md" /> {/* Input */}
              </div>
            </div>
            <div>
              <Skeleton className="h-4 w-1/5 mb-1" /> {/* Label */}
              <Skeleton className="h-10 w-full rounded-md" /> {/* Input */}
            </div>
            <div>
              <div className="flex items-center mb-1">
                <Skeleton className="h-5 w-5 mr-2 rounded-full" />{" "}
                {/* Icon placeholder */}
                <Skeleton className="h-4 w-1/3" /> {/* Label */}
              </div>
              <Skeleton className="h-10 w-full rounded-md" />{" "}
              {/* Input (disabled) */}
            </div>
            <div>
              <Skeleton className="h-4 w-1/4 mb-1" /> {/* Label */}
              <Skeleton className="h-24 w-full rounded-md" /> {/* Textarea */}
            </div>
            <div className="flex justify-end pt-4">
              <Skeleton className="h-10 w-28 rounded-md" /> {/* Button */}
            </div>
          </div>
        </section>

        {/* Skeleton for Reviews Section */}
        <section>
          <Skeleton className="h-8 w-2/3 mb-6" />{" "}
          {/* Heading: Jak vás ohodnotili ostatní */}
          <div className="space-y-4">
            {[...Array(1)].map(
              (
                _,
                i // Show 1 review skeleton for brevity
              ) => (
                <div key={i} className="bg-white p-4 shadow rounded-lg">
                  <Skeleton className="h-4 w-3/4 mb-2" />{" "}
                  {/* Review text/name */}
                  <Skeleton className="h-4 w-1/2 mb-2" />{" "}
                  {/* Review stars/date */}
                  <Skeleton className="h-4 w-1/4" /> {/* Reviewer */}
                </div>
              )
            )}
          </div>
        </section>
      </div>
    );
  }

  if (error || !userProfile?.data) {
    return (
      <div className="container mx-auto p-4 text-center text-red-500 flex flex-col items-center justify-center h-screen">
        <p>Chyba při načítání profilu.</p>
        <TryAgain refetch={refetch} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-8 space-y-12">
      {/* Section for Profile Images */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-gray-700">
          Vaše profilové fotografie
        </h2>
        <ProfileImageManager initialImages={finalDisplayImages} />
      </section>

      {/* Section for User Information */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-gray-700">
          Osobní údaje
        </h2>
        <UserInfoSection defaultValues={userInfoDefaultValues} />
      </section>

      {/* Section for Reviews */}
      {mappedReviews && mappedReviews.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-6 text-gray-700 flex items-center gap-2">
            Jak vás ohodnotili ostatní
            <CommentRatings
              className="inline-block ml-4"
              rating={userProfile?.data.rating || 0}
              totalStars={5}
              size={24}
              variant="yellow"
              disabled
            />
            <span className="text-gray-500 text-md">
              {" "}
              {userProfile?.data.rating.toFixed(1)} (
              {userProfile?.data.ratingCount})
            </span>
          </h2>
          <ReviewCarousel reviews={mappedReviews || []} isEmployer />
        </section>
      )}
      {(!mappedReviews || mappedReviews.length === 0) && (
        <section>
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">
            Jak vás ohodnotili ostatní
          </h2>
          <p className="text-gray-500">Zatím nemáte žádná hodnocení.</p>
        </section>
      )}
    </div>
  );
}
