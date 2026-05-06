import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell/AdminShell";
import { hasServerStoredAuthToken } from "@/lib/auth/server";
import { ROUTES } from "@/lib/routes";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!(await hasServerStoredAuthToken())) {
    redirect(ROUTES.login);
  }

  return <AdminShell>{children}</AdminShell>;
}
