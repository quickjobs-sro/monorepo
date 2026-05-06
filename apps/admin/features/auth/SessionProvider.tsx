"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { getClientStoredAuthToken, removeClientStoredAuthToken } from "@/lib/auth/cookie";
import type { AdminSessionUser } from "@/lib/openapi/types";
import { ROUTES } from "@/lib/routes";
import { fetchAdminMe } from "./api";
import { adminSessionQueryKey } from "./queries";

type AdminSessionContextValue = {
  user: AdminSessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => void;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function AdminSessionProvider({
  children,
  initialHasToken,
}: {
  children: ReactNode;
  initialHasToken: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(initialHasToken);

  const sessionQuery = useQuery({
    queryKey: adminSessionQueryKey,
    queryFn: fetchAdminMe,
    enabled: hasToken,
    retry: false,
  });

  useEffect(() => {
    setHasToken(Boolean(getClientStoredAuthToken()));
  }, [pathname]);

  useEffect(() => {
    if (!hasToken && pathname !== ROUTES.login) {
      router.replace(ROUTES.login);
    }
  }, [hasToken, pathname, router]);

  useEffect(() => {
    if (pathname === ROUTES.login && sessionQuery.data?.user) {
      router.replace(ROUTES.dashboard);
    }
  }, [pathname, router, sessionQuery.data?.user]);

  useEffect(() => {
    const status = (sessionQuery.error as { status?: number } | null)?.status;
    if (status === 401) {
      removeClientStoredAuthToken();
      queryClient.removeQueries({ queryKey: adminSessionQueryKey });
      if (pathname !== ROUTES.login) {
        router.replace(ROUTES.login);
      }
    }
  }, [pathname, queryClient, router, sessionQuery.error]);

  async function refreshSession() {
    await sessionQuery.refetch();
  }

  function signOut() {
    removeClientStoredAuthToken();
    setHasToken(false);
    queryClient.clear();
    router.replace(ROUTES.login);
  }

  return (
    <AdminSessionContext.Provider
      value={{
        user: sessionQuery.data?.user ?? null,
        isAuthenticated: Boolean(sessionQuery.data?.user),
        isLoading: hasToken && sessionQuery.isLoading,
        refreshSession,
        signOut,
      }}
    >
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const context = useContext(AdminSessionContext);
  if (!context) {
    throw new Error("useAdminSession must be used within AdminSessionProvider");
  }

  return context;
}
