const MIN_USER_SEARCH_LENGTH = 3;
export const USER_SEARCH_LIMIT = 20;
export const USER_SEARCH_DEBOUNCE_MS = 300;

export type UserSearchQueryParams = {
  limit: number;
  q: string;
  deleted: false;
};

export function normalizeUserSearchTerm(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function canSearchUsers(value: string): boolean {
  return normalizeUserSearchTerm(value).length >= MIN_USER_SEARCH_LENGTH;
}

export function shouldEnableUserSearch(open: boolean, value: string): boolean {
  return open && canSearchUsers(value);
}

export function buildUserSearchQueryParams(
  value: string,
): UserSearchQueryParams {
  return {
    limit: USER_SEARCH_LIMIT,
    q: normalizeUserSearchTerm(value),
    deleted: false,
  };
}
