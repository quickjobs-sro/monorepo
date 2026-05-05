import { useQuery } from "@tanstack/react-query";
import API, { PrivateUserProfile, Review } from "quickjobs-api-wrapper";
import { API_KEYS } from "../types/api_keys";

export const useGetPendingReviews = () => {
  return useQuery({
    queryKey: [API_KEYS.PENDING_REVIEWS],
    queryFn: () => API.reviews.getPendingReviews(),
    select(data) {
      const validUsers = data.users?.filter((user: PrivateUserProfile) => 
        user.email
      ) 
      const validPendingReviews = data.pendingReviews?.filter((review: Review) => 
        validUsers.some((user: PrivateUserProfile) => user.id === review.candidateId)
      ) 
      
      return {
        ...data,
        pendingReviews: validPendingReviews,
        users: validUsers
      };
    },
  });
};
