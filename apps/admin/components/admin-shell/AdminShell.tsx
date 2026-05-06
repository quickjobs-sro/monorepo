"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@ui/components/core/button";
import { Badge } from "@ui/components/core/badge";
import { Card, CardContent } from "@ui/components/core/card";
import { cn } from "@ui/lib/utils";
import { formatName } from "@/lib/formatting";
import { useAdminSession } from "@/features/auth/SessionProvider";
import { comingSoonNavigation, navigationGroups } from "./navigation";

function NavigationLink({
  href,
  label,
  description,
  active,
  disabled,
}: {
  href?: string;
  label: string;
  description: string;
  active?: boolean;
  disabled?: boolean;
}) {
  if (!href || disabled) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
          </div>
          <Badge variant="secondary" className="bg-slate-200 text-slate-600">
            Soon
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-2xl border px-4 py-3 transition-all",
        active
          ? "border-emerald-900 bg-emerald-950 text-white shadow-[0_18px_40px_-28px_rgba(6,78,59,0.9)]"
          : "border-transparent bg-white/70 text-slate-700 hover:border-emerald-200 hover:bg-white"
      )}
    >
      <p className="font-medium">{label}</p>
      <p className={cn("mt-1 text-xs leading-5", active ? "text-emerald-100/90" : "text-slate-500")}>{description}</p>
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, signOut } = useAdminSession();

  const displayName = formatName([user?.givenName, user?.familyName]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(180deg,_#f7faf8_0%,_#eef2ef_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-[320px] shrink-0 border-r border-white/80 bg-white/70 px-6 py-8 backdrop-blur xl:flex xl:flex-col xl:gap-8">
          <div className="space-y-3">
            <div className="inline-flex rounded-full bg-emerald-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-50">
              QuickJobs Admin
            </div>
            <div className="space-y-2">
              <h2 className="font-[family-name:var(--font-red-hat-display)] text-3xl font-bold tracking-tight text-slate-950">
                Command Center
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                Read-only administrace postavená nad aktuálními endpointy bez legacy wrapperu.
              </p>
            </div>
          </div>

          <nav className="space-y-6">
            {navigationGroups.map((group) => (
              <div key={group.label} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">{group.label}</p>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <NavigationLink
                      key={item.label}
                      href={item.href}
                      label={item.label}
                      description={item.description}
                      active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">Coming Soon</p>
            <div className="space-y-2">
              {comingSoonNavigation.map((item) => (
                <NavigationLink
                  key={item.label}
                  label={item.label}
                  description={item.description}
                  disabled
                />
              ))}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 px-5 py-4 backdrop-blur md:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">QuickJobs</p>
                <div>
                  <h1 className="font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">Admin v1</h1>
                  <p className="text-sm text-slate-600">
                    Přehled současných read-only dat a připravené místo pro další admin domény.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="hidden gap-2 overflow-x-auto pb-1 lg:flex xl:hidden">
                  {navigationGroups[0]?.items.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href!}
                      className={cn(
                        "rounded-full border px-3 py-2 text-sm font-medium",
                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                          ? "border-emerald-900 bg-emerald-950 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <Card className="border-white/80 bg-white/85 shadow-none">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {isLoading ? "Obnovuji session" : "Přihlášený admin"}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                      <div className="flex flex-wrap gap-2">
                        {(user?.roles ?? []).map((role: string) => (
                          <Badge key={role} className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" onClick={signOut}>
                      Odhlásit
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </header>

          <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
            {user || isLoading ? children : null}
          </main>
        </div>
      </div>
    </div>
  );
}
