import type { AdminFeedbackResponse } from "@/lib/openapi/types";
import { fetchJson } from "@/lib/api/fetchJson";

export type FeedbackQueryParams = {
  limit?: number;
  since?: string;
  until?: string;
};

export async function fetchFeedback(params: FeedbackQueryParams = {}) {
  return fetchJson<AdminFeedbackResponse>("/admin/feedback", {
    auth: true,
    query: {
      limit: params.limit,
      since: params.since,
      until: params.until,
    },
  });
}
