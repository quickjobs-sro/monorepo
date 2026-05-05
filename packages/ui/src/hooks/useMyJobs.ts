import { useInfiniteQuery } from "@tanstack/react-query";
import API, { JOB_TERM } from "quickjobs-api-wrapper";
import { API_KEYS } from "../types/api_keys";

export const useMyJobs = (term: JOB_TERM | undefined) => {
  const {
    data,
    isLoading,
    isSuccess,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: [API_KEYS.MY_JOBS, term],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      if (!term) {
        return {
          jobs: [],
          pageInfo: { last: undefined, count: 0, total: 0 },
          stats: [],
        };
      }
      try {
        return await API.jobs.myJobs({ term, until: pageParam });
      } catch (error) {
        console.error("Failed to fetch my jobs:", error);
        throw error; // Let React Query handle the error state properly
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: { pageInfo?: { last?: string | null } }) =>
      lastPage.pageInfo?.last ?? undefined,
    enabled: !!term,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
    refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
    refetchOnMount: false, // Don't refetch on mount if we have cached data
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  return {
    data,
    isLoading,
    isSuccess,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
    isError,
    error,
    refetch,
  };
};
