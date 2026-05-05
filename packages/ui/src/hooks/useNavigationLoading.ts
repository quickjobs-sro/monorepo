"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export const useNavigationLoading = () => {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      startTransition(() => {
        setIsNavigating(false);
        previousPathname.current = pathname;
      });
    }
  }, [pathname, startTransition]);

  const handleNavigationStart = () => {
    setIsNavigating(true);
  };

  return {
    isLoading: isNavigating || isPending,
    handleNavigationStart,
  };
};
