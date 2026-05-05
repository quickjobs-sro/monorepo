/**
 * Report an error to Sentry. Safe to call from client or server; no-op if Sentry is not loaded.
 * Use in catch blocks so that handled errors are still sent to Sentry.
 */
import * as Sentry from "@sentry/nextjs";

export function reportError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  try {
    const err =
      error instanceof Error ? error : new Error(String(error));
    if (context && Object.keys(context).length > 0) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        Sentry.captureException(err);
      });
    } else {
      Sentry.captureException(err);
    }
  } catch {
    // Sentry not available or capture failed (e.g. in test env)
  }
}
