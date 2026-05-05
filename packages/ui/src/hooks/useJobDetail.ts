import { useQuery } from "@tanstack/react-query";
import API from "quickjobs-api-wrapper";
import { API_KEYS } from "../types/api_keys";

export const useJobDetail = (id: string | undefined) => {
  const numericId = id ? Number(id) : NaN;
  const isValidId = !isNaN(numericId);

  const data = useQuery({
    queryKey: [API_KEYS.MY_JOB_DETAIL, id],
    queryFn: async () => {
      if (!isValidId) {
        return null;
      }
      return API.jobs.job(numericId);
    },
    enabled: !!id && isValidId,
  });

  return { ...data };
};
