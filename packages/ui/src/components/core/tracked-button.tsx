"use client";

import * as React from "react";
import { useAnalyticsTrack } from "../../contexts/analytics-context";
import { Button, type ButtonProps } from "./button";

/**
 * Client-only Button that injects onGaEvent from AnalyticsProvider.
 * Use this when you need gaCategory/gaAction/gaLabel; use Button for server-only or when no GA.
 */
export const TrackedButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const track = useAnalyticsTrack();
    const onGaEvent =
      props.gaCategory != null && props.gaAction != null && props.gaLabel != null
        ? track
        : undefined;
    return <Button ref={ref} {...props} onGaEvent={onGaEvent} />;
  }
);
TrackedButton.displayName = "TrackedButton";
