import { camelizeDeep, createRequestError, parseResponseBody } from "./shared";

type LocalFetchJsonOptions = {
  body?: unknown;
  method?: string;
  requestInit?: RequestInit;
  signal?: AbortSignal;
};

export async function localFetchJson<T>(path: string, options: LocalFetchJsonOptions = {}): Promise<T> {
  const headers = new Headers(options.requestInit?.headers);
  const hasBody = options.body !== undefined;
  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options.requestInit,
    method: options.method ?? (hasBody ? "POST" : "GET"),
    cache: "no-store",
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

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
