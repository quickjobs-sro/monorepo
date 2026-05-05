import Cookies from "js-cookie";
import API from "quickjobs-api-wrapper";
import { useCallback } from "react";

export const useTokenRestore = () => {
  const restoreToken = useCallback(async () => {
    const userToken = Cookies.get("QuickJobs.tokens");

    if (!userToken) {
      return null;
    }

    try {
      const parsedToken = JSON.parse(userToken);

      // Try to use the API wrapper directly (works in client-side)
      try {
        const restoredToken = API.restoreUserToken(parsedToken);

        // Update the cookie with restored token
        Cookies.set("QuickJobs.tokens", JSON.stringify(restoredToken), {
          secure: true,
          sameSite: "strict",
          expires: 30,
        });

        return restoredToken;
      } catch (apiError) {
        // If API wrapper fails, fallback to API route
        console.warn("API wrapper failed, using API route fallback:", apiError);

        const response = await fetch("/api/auth/restore", {
          method: "POST",
          credentials: "include",
        });

        if (response.ok) {
          const result = await response.json();
          return result;
        } else {
          // Token restoration failed, remove invalid token
          Cookies.remove("QuickJobs.tokens");
          return null;
        }
      }
    } catch (error) {
      console.error("Error restoring token:", error);
      Cookies.remove("QuickJobs.tokens");
      return null;
    }
  }, []);

  return { restoreToken };
};
