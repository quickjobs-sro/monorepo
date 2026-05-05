import { Review } from "quickjobs-api-wrapper";
import { Card, CardContent } from "../components/core/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../components/core/carousel";
import { CommentRatings } from "../components/core/rating";
import { cn } from "../lib/utils";

type ReviewCarouselProps = {
  reviews: (Partial<Review> & { value?: number })[];
  isEmployer?: boolean;
};

const ReviewCarousel = ({ reviews, isEmployer }: ReviewCarouselProps) => {
  if (!reviews) {
    return null;
  }

  const filteredReviews = reviews.filter((review) => {
    const val = review.rating ?? review.value;
    return val != null && val > 0;
  });

  if (filteredReviews?.length === 0) {
    return null;
  }

  return (
    <div className={cn("pt-8 relative pl-0 sm:pl-16 md:pl-24", isEmployer && "pl-0 sm:pl-0 md:pl-0")}>
      {!isEmployer && (
        <h3 className="mb-2 text-[#002d48] text-md font-medium underline">
          Hodnocení od zaměstnavatelů
        </h3>
      )}
      <div
        className={cn("relative w-full mx-auto px-12", isEmployer && "px-4")}
      >
        <Carousel className="w-full">
          <CarouselContent>
            {filteredReviews.map((review, idx) => (
              <CarouselItem key={idx} className="basis-full sm:basis-1/2 px-10">
                <Card className="min-h-[100px] sm:min-h-[120px] flex items-start bg-transparent shadow-none border-none">
                  <CardContent className="px-0 py-2 w-full border-none">
                    <div className="min-h-[35px] sm:min-h-[40px] flex flex-col items-start mb-1">
                      <p className="text-sm text-[#002d48] mb-2">
                        {review.message || "Bez slovního hodnocení"}
                      </p>
                      <CommentRatings
                        rating={review.rating ?? review.value ?? 0}
                        fill
                        totalStars={5}
                        size={24}
                        variant="yellow"
                        disabled
                      />
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-4 sm:-left-12" />
          <CarouselNext className="-right-4 sm:-right-12" />
        </Carousel>
      </div>
    </div>
  );
};

export default ReviewCarousel;
