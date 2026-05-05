import { useQuery } from "@tanstack/react-query";
import API from "quickjobs-api-wrapper";

export const getUserInfo = () => {
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => API.users.getProfile(),
  });
  return data;
};
