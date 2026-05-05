import { useQuery } from "@tanstack/react-query";
import { API } from ".";
import { API_KEYS } from "../types/api_keys";

export const useGetServiceInfo = () => {
  return useQuery({
    queryKey: [API_KEYS.SERVICE_INFO],
    queryFn: () => API.services.getServiceInfo(),
    refetchOnMount: true,
  });
};
