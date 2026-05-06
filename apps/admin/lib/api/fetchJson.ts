import { getApiRevision } from "../backendConfig";
import { getClientStoredAuthToken } from "../auth/cookie";
import { refreshStoredToken, resolveStoredAuthToken } from "../auth/session";
import { getBearerToken, type StoredAdminToken } from "../auth/token";
import {
  buildUrl,
  camelizeDeep,
  createRequestError,
  parseResponseBody,
  type QueryParams,
} from "./shared";

type FetchJsonOptions = {
  auth?: boolean;
  body?: unknown;
  method?: string;
  query?: QueryParams;
  requestInit?: RequestInit;
  signal?: AbortSignal;
  token?: StoredAdminToken | null;
};

async function fetchJsonInternal<T>(
  path: string,
  options: FetchJsonOptions,
  allowUnauthorizedRetry: boolean
): Promise<T> {
  let resolvedToken: StoredAdminToken | null = options.token ?? null;
  const headers = new Headers(options.requestInit?.headers);
  headers.set("X-Revision", getApiRevision());

  if (options.auth) {
    resolvedToken = await resolveStoredAuthToken(options.token ?? getClientStoredAuthToken());
    const bearer = getBearerToken(resolvedToken);

    if (!bearer) {
      throw createRequestError(401, "Unauthorized");
    }

    headers.set("Authorization", bearer);
  }

  const hasBody = options.body !== undefined;
  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, options.query), {
    ...options.requestInit,
    method: options.method ?? (hasBody ? "POST" : "GET"),
    cache: options.auth ? "no-store" : options.requestInit?.cache ?? "default",
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (response.status === 401 && options.auth && allowUnauthorizedRetry && resolvedToken?.refreshToken) {
    const refreshedToken = await refreshStoredToken(resolvedToken);
    return fetchJsonInternal<T>(path, { ...options, token: refreshedToken }, false);
  }

  const responseBody = camelizeDeep(await parseResponseBody(response));
  if (!response.ok) {
    const message =
      typeof responseBody === "string"
        ? responseBody
        : `Request failed with status ${response.status}.`;
    throw createRequestError(response.status, message, responseBody);
  }

  return responseBody as T;
}

export async function fetchJson<T>(path: string, options: FetchJsonOptions = {}): Promise<T> {
  return fetchJsonInternal<T>(path, options, true);
}
