"use client";

import { cn } from "@ui/lib/utils";
import Image from "next/image";
import { TrackedAnchor } from "@ui/components/core/tracked-anchor";

interface MobileAppButtonsProps {
  isShort?: boolean;
  isDetail?: boolean;
  isInactive?: boolean;
  wrapperClassName?: string;
  textClassName?: string;
  /** Left-align and larger text (e.g. on jobs page mobile) */
  alignLeft?: boolean;
  /** Hide the "Buď první..." heading text (e.g. when redundant with content above) */
  hideHeadingText?: boolean;
}

export const MobileAppButtons = ({
  isShort = false,
  isDetail = false,
  isInactive = false,
  wrapperClassName = "",
  textClassName = "",
  alignLeft = false,
  hideHeadingText = false,
}: MobileAppButtonsProps) => {
  return (
    <div className={cn(
      "flex flex-col gap-4 py-4",
      alignLeft ? "items-start text-left" : "items-center text-center",
      wrapperClassName
    )} >
      {!hideHeadingText && (
      <p className={cn(
        alignLeft ? "text-base text-gray-700" : "text-sm text-gray-700 text-center",
        textClassName
      )}>
        <b> Buď první, kdo se o nabídkách dozví.
          <br />
          Nech si posílat nabídky přímo do mobilu.</b>
      </p>
      )}
      <div className={cn("flex gap-4", alignLeft ? "flex-wrap" : "")}>
        <TrackedAnchor
          href="https://apps.apple.com/cz/app/quickjobs-cz/id1116612770"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center"
          gaCategory="App download"
          gaAction="App Store"
          gaLabel={isDetail ? "detail" : "list"}
        >
          <Image
            src="/img/app-store-badge.svg"
            alt="Download on the App Store"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </TrackedAnchor>
        <TrackedAnchor
          href="https://play.google.com/store/apps/details?id=cz.quickjobs.midgard&hl=en"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center"
          gaCategory="App download"
          gaAction="Google Play"
          gaLabel={isDetail ? "detail" : "list"}
        >
          <Image
            src="/img/google-play-badge.svg"
            alt="Get it on Google Play"
            width={135}
            height={40}
            className="h-10 w-auto"
          />
        </TrackedAnchor>
      </div>
    </div>
  );
};

