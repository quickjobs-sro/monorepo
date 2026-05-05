"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useAnalyticsTrack } from "../../contexts/analytics-context";
import { useOptionalNavigationLoadingContext } from "./navigation-loading-provider";

type NextLinkProps = ComponentProps<typeof Link> & {
  gaCategory?: string;
  gaAction?: string;
  gaLabel?: string;
  gaCompanyId?: string | number;
  gaCompanyName?: string;
};

function getPathnameFromHref(href: string): string {
  if (href.startsWith("/")) return href.split("?")[0] ?? href;
  try {
    return new URL(href).pathname;
  } catch {
    return href.split("?")[0] ?? href;
  }
}

/**
 * Next.js Link that triggers the navigation loading bar on click (only when navigating to a different path).
 * Optional: use inside NavigationLoadingProvider to show the bar.
 */
export const NavigationLink = ({
  onClick,
  href,
  gaCategory,
  gaAction,
  gaLabel,
  gaCompanyId,
  gaCompanyName,
  ...props
}: NextLinkProps) => {
  const pathname = usePathname();
  const ctx = useOptionalNavigationLoadingContext();
  const track = useAnalyticsTrack();
  const gaOptions =
    gaCompanyId != null || (gaCompanyName != null && gaCompanyName !== "")
      ? { companyId: gaCompanyId, companyName: gaCompanyName }
      : undefined;

  return (
    <Link
      {...props}
      href={href}
      onClick={(e) => {
        if (gaCategory != null && gaAction != null && gaLabel != null) {
          track(gaCategory, gaAction, gaLabel, gaOptions);
        }
        const hrefStr =
          typeof href === "string" ? href : href && typeof href === "object" && "pathname" in href ? String((href as { pathname?: string }).pathname ?? "") : "";
        const targetPath = getPathnameFromHref(hrefStr);
        if (targetPath && pathname !== targetPath) {
          ctx?.handleNavigationStart();
        }
        onClick?.(e);
      }}
    />
  );
};
