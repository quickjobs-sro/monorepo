import { fetchJson } from "@/lib/api/fetchJson";
import {
  buildCompanyAnalyticsRequest,
  buildJobAnalyticsRequest,
} from "./params";
import type {
  AdminAnalyticsCompanyResponse,
  AdminAnalyticsJobResponse,
  CompanyAnalyticsQuery,
  JobAnalyticsQuery,
} from "./types";

export async function fetchCompanyAnalytics(params: CompanyAnalyticsQuery) {
  const request = buildCompanyAnalyticsRequest(params);

  return fetchJson<AdminAnalyticsCompanyResponse>(request.path, {
    auth: true,
    query: request.query,
  });
}

export async function fetchJobAnalytics(params: JobAnalyticsQuery) {
  const request = buildJobAnalyticsRequest(params);

  return fetchJson<AdminAnalyticsJobResponse>(request.path, {
    auth: true,
    query: request.query,
  });
}
