import type { FeedbackQueryParams } from "./api";

export function feedbackQueryKey(params: FeedbackQueryParams) {
  return ["admin", "feedback", params.limit ?? 10, params.since ?? null, params.until ?? null] as const;
}
