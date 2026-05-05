import { useQuery } from "@tanstack/react-query";
import { API } from "../hooks";
import { API_KEYS } from "../types/api_keys";

export const useGetReview = () => {
  return useQuery({
    queryKey: [API_KEYS.REVIEWS],
    queryFn: () => API.reviews.getMyReviews(),
  });
};
