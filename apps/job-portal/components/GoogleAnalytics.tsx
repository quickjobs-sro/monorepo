"use client";

import { usePathname } from "next/navigation";
import { useEffect, Suspense } from "react";
import Script from "next/script";
import { logPageView, GA_TRACKING_ID } from "../lib/analytics";

function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!GA_TRACKING_ID) return;
    logPageView();
  }, [pathname]);
  return null;
}

export function GoogleAnalytics() {
  if (!GA_TRACKING_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_TRACKING_ID}');
        `}
      </Script>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
