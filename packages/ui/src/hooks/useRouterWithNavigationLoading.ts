"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useOptionalNavigationLoadingContext } from "../components/core/navigation-loading-provider";

/**
 * Same as useRouter() but push() triggers the navigation loading bar when used inside NavigationLoadingProvider.
 */
export function useRouterWithNavigationLoading() {
  const router = useRouter();
  const ctx = useOptionalNavigationLoadingContext();
  const push = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      ctx?.handleNavigationStart();
      router.push(href, options);
    },
    [router, ctx]
  );
  return { ...router, push };
}
