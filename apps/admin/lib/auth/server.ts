import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE_NAME } from "./constants";

export async function hasServerStoredAuthToken(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(AUTH_TOKEN_COOKIE_NAME);
}
