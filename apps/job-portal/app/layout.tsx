"use client";
import { Toaster } from "@ui/components/core/toaster";
import { NavigationLoadingProvider } from "@ui/components/core/navigation-loading-provider";
import { AnalyticsProvider } from "@ui/contexts/analytics-context";
import { TokenRestoreProvider } from "../components/TokenRestoreProvider";
import { eventGA } from "../lib/analytics";
import { AnalyticsUserIdSync } from "../components/AnalyticsUserIdSync";
import "@ui/styles/globals.css";
import { GoogleAnalytics } from "../components/GoogleAnalytics";
import { AppQueryProvider } from "../components/AppQueryProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Red+Hat+Display:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <title>QuickJOBS - Job Portal</title>
        <meta
          name="description"
          content="QuickJOBS Job Portal"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:locale" content="cs_CZ" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="QuickJOBS - Job Portal" />
        <meta
          property="og:description"
          content="QuickJOBS Job Portal"
        />
        <link rel="icon" href="/img/favicon.ico" />

      </head>
      <body className="font-sans">
        <GoogleAnalytics />
          <AnalyticsProvider track={eventGA}>
            <AppQueryProvider>
              <TokenRestoreProvider>
                <AnalyticsUserIdSync />
                <NavigationLoadingProvider>
                  <div className="min-h-screen max-w-7xl mx-auto">{children}</div>
                  <Toaster />
                </NavigationLoadingProvider>
              </TokenRestoreProvider>
            </AppQueryProvider>
          </AnalyticsProvider>
      </body>
    </html>
  );
}
