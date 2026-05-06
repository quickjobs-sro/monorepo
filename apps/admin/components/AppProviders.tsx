"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Toaster } from "@ui/components/core/toaster";
import { appQueryClient } from "@/lib/queryClient";
import { AdminSessionProvider } from "@/features/auth/SessionProvider";

export function AppProviders({
  children,
  initialHasToken,
}: {
  children: ReactNode;
  initialHasToken: boolean;
}) {
  return (
    <QueryClientProvider client={appQueryClient}>
      <AdminSessionProvider initialHasToken={initialHasToken}>
        {children}
        <Toaster />
      </AdminSessionProvider>
    </QueryClientProvider>
  );
}
