import Cookies from "js-cookie";
import { useEffect, useState } from "react";

export function useAuthLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const [userToken, setUserToken] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = Cookies.get("QuickJobs.tokens");
    setUserToken(token);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const checkAuthStatus = async () => {
      if (!userToken) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Make a lightweight request to verify the token
        const response = await fetch("/api/auth/check", {
          headers: {
            "Content-Type": "application/json",
          },
        });

        // The x-auth-checking header will be set by middleware
        const isChecking = response.headers.get("x-auth-checking");
        setIsLoading(!!isChecking);
      } catch (error) {
        console.error("Error checking auth status:", error);
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [mounted, userToken]);

  return { isLoading };
}
