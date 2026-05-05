import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "https://e58a0ddb31f13bc71f33ce461a115227@o4510985654501376.ingest.de.sentry.io/4510985689890896",
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  // Unhandled exceptions and promise rejections are captured by Sentry's default integration
  integrations: [
    Sentry.replayIntegration(),
    Sentry.feedbackIntegration({ colorScheme: "system" }),
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
