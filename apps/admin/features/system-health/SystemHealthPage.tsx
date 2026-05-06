"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@ui/components/core/card";
import { Badge } from "@ui/components/core/badge";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getBackendBaseUrl, getApiRevision } from "@/lib/backendConfig";
import { getErrorMessage } from "@/lib/errors";
import { useAdminSession } from "@/features/auth/SessionProvider";
import { fetchHealth } from "./api";
import { healthQueryKey } from "./queries";

export function SystemHealthPage() {
  const { user, isAuthenticated } = useAdminSession();
  const healthQuery = useQuery({
    queryKey: healthQueryKey,
    queryFn: fetchHealth,
    retry: 0,
  });

  const isHealthy = healthQuery.data?.ok === true;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="System Health"
        description="Technický přehled dostupnosti backendu, revize API a stavu admin session vrstvy."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-2 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Backend Health</p>
            {healthQuery.isLoading ? (
              <p className="text-sm text-slate-500">Načítám...</p>
            ) : healthQuery.isError ? (
              <p className="text-sm text-rose-700">{getErrorMessage(healthQuery.error)}</p>
            ) : (
              <div className="space-y-2">
                <Badge className={isHealthy ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}>
                  {isHealthy ? "OK" : "Problem"}
                </Badge>
                <p className="text-sm text-slate-600">Endpoint `/health` odpověděl payloadem <code>{'{"ok":true}'}</code>.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-2 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Session</p>
            <Badge className={isAuthenticated ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}>
              {isAuthenticated ? "Authenticated" : "Missing session"}
            </Badge>
            <p className="text-sm text-slate-600">{user?.email ?? user?.phone ?? "Bez identifikace uživatele"}</p>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-2 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Config</p>
            <p className="text-sm text-slate-600">API URL: {getBackendBaseUrl()}</p>
            <p className="text-sm text-slate-600">Revision header: {getApiRevision()}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
