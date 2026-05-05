"use client";

import * as React from "react";
import { useAnalyticsTrack } from "../../contexts/analytics-context";

export interface TrackedAnchorProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  gaCategory?: string;
  gaAction?: string;
  gaLabel?: string;
  gaCompanyId?: string | number;
  gaCompanyName?: string;
}

/**
 * <a> with optional GA tracking. Use for external links; use NavigationLink for in-app routes.
 */
export const TrackedAnchor = React.forwardRef<HTMLAnchorElement, TrackedAnchorProps>(
  ({ onClick, gaCategory, gaAction, gaLabel, gaCompanyId, gaCompanyName, ...props }, ref) => {
    const track = useAnalyticsTrack();
    const gaOptions =
      gaCompanyId != null || (gaCompanyName != null && gaCompanyName !== "")
        ? { companyId: gaCompanyId, companyName: gaCompanyName }
        : undefined;
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        gaCategory != null &&
        gaAction != null &&
        gaLabel != null
      ) {
        track(gaCategory, gaAction, gaLabel, gaOptions);
      }
      onClick?.(e);
    };
    return <a ref={ref} onClick={handleClick} {...props} />;
  }
);
TrackedAnchor.displayName = "TrackedAnchor";
