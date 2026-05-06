import { getBackendBaseUrl } from "../backendConfig";

export type ApiRequestError = Error & {
  status?: number;
  response?: {
    status?: number;
    data?: unknown;
  };
};

type Primitive = string | number | boolean;
export type QueryValue = Primitive | Primitive[] | undefined | null;
export type QueryParams = Record<string, QueryValue>;

function toCamelCaseKey(key: string): string {
  return key.replace(/[_-]([a-z])/g, (_, char: string) => char.toUpperCase());
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function camelizeDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeDeep(item)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
    acc[toCamelCaseKey(key)] = camelizeDeep(nestedValue);
    return acc;
  }, {}) as T;
}

export function createRequestError(status: number, message: string, data?: unknown): ApiRequestError {
  const error = new Error(message) as ApiRequestError;
  error.status = status;
  error.response = { status, data };
  return error;
}

export async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(path.replace(/^\/+/, ""), getBackendBaseUrl());

  if (!query) {
    return url.toString();
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value == null) {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        url.searchParams.set(key, value.join(","));
      }
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}
