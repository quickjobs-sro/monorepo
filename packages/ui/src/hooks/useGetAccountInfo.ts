import { useQuery } from "@tanstack/react-query";
import API from "quickjobs-api-wrapper";
import { API_KEYS } from "../types/api_keys";

export const useGetAccountInfo = () => {
  const data = useQuery({
    queryKey: [API_KEYS.ACCOUNT_INFO],
    queryFn: () => API.users.getAccountInfo(),
  });
  return { ...data };
};
