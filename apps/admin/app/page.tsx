import { redirect } from "next/navigation";
import { hasServerStoredAuthToken } from "@/lib/auth/server";
import { ROUTES } from "@/lib/routes";

export default async function HomePage() {
  if (await hasServerStoredAuthToken()) {
    redirect(ROUTES.dashboard);
  }

  redirect(ROUTES.login);
}
