"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, Building2, GraduationCap, HeartPulse, MessageSquareMore } from "lucide-react";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { Badge } from "@ui/components/core/badge";
import { MetricCard } from "@/components/admin-shell/MetricCard";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { comingSoonNavigation, navigationGroups } from "@/components/admin-shell/navigation";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatName } from "@/lib/formatting";
import { useAdminSession } from "@/features/auth/SessionProvider";
import { fetchCompanies } from "@/features/companies/api";
import { companiesQueryKey } from "@/features/companies/queries";
import { fetchFeedback } from "@/features/feedback/api";
import { feedbackQueryKey } from "@/features/feedback/queries";
import { fetchPublicJobs } from "@/features/jobs/api";
import { jobsQueryKey } from "@/features/jobs/queries";
import { fetchSchools } from "@/features/schools/api";
import { schoolsQueryKey } from "@/features/schools/queries";
import { fetchHealth } from "@/features/system-health/api";
import { healthQueryKey } from "@/features/system-health/queries";
import { JOB_TERMS } from "@/lib/openapi/types";

function getMetricValue(input: { isLoading: boolean; isError: boolean; value?: number | boolean | null }) {
  if (input.isLoading) {
    return "…";
  }

  if (input.isError || input.value == null) {
    return "Chyba";
  }

  if (typeof input.value === "boolean") {
    return input.value ? "OK" : "Fail";
  }

  return String(input.value);
}

export function DashboardPage() {
  const { user } = useAdminSession();
  const healthQuery = useQuery({
    queryKey: healthQueryKey,
    queryFn: fetchHealth,
    retry: 0,
  });
  const feedbackQuery = useQuery({
    queryKey: feedbackQueryKey({ limit: 5 }),
    queryFn: () => fetchFeedback({ limit: 5 }),
  });
  const jobsQuery = useQuery({
    queryKey: jobsQueryKey([...JOB_TERMS]),
    queryFn: () => fetchPublicJobs({ term: [...JOB_TERMS] }),
  });
  const companiesQuery = useQuery({
    queryKey: companiesQueryKey,
    queryFn: fetchCompanies,
  });
  const schoolsQuery = useQuery({
    queryKey: schoolsQueryKey,
    queryFn: fetchSchools,
  });

  const liveLinks = navigationGroups.flatMap((group) => group.items.filter((item) => item.href));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Dashboard"
        description="Operativní snapshot nad health, posledním feedbackem a referenčními katalogy. Každý blok načítá data samostatně, takže jedna chyba neshodí celý přehled."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Backend health"
          value={getMetricValue({ isLoading: healthQuery.isLoading, isError: healthQuery.isError, value: healthQuery.data?.ok })}
          hint={healthQuery.isError ? getErrorMessage(healthQuery.error) : "Přímý ping na /health"}
          icon={HeartPulse}
          tone={healthQuery.isError || healthQuery.data?.ok === false ? "danger" : "default"}
        />
        <MetricCard
          title="Latest feedback"
          value={getMetricValue({ isLoading: feedbackQuery.isLoading, isError: feedbackQuery.isError, value: feedbackQuery.data?.feedback.length })}
          hint={feedbackQuery.isError ? getErrorMessage(feedbackQuery.error) : "Počet položek v prvním řezu"}
          icon={MessageSquareMore}
          tone={feedbackQuery.isError ? "danger" : "default"}
        />
        <MetricCard
          title="Public jobs"
          value={getMetricValue({ isLoading: jobsQuery.isLoading, isError: jobsQuery.isError, value: jobsQuery.data?.jobs.length })}
          hint={jobsQuery.isError ? getErrorMessage(jobsQuery.error) : "Aktuální veřejné nabídky"}
          icon={BriefcaseBusiness}
          tone={jobsQuery.isError ? "danger" : "default"}
        />
        <MetricCard
          title="Catalog coverage"
          value={getMetricValue({
            isLoading: companiesQuery.isLoading || schoolsQuery.isLoading,
            isError: companiesQuery.isError || schoolsQuery.isError,
            value: (companiesQuery.data?.companies.length ?? 0) + (schoolsQuery.data?.schools.length ?? 0),
          })}
          hint={
            companiesQuery.isError || schoolsQuery.isError
              ? "Část katalogu se nepodařila načíst"
              : "Firmy + školy v read-only administraci"
          }
          icon={Building2}
          tone={companiesQuery.isError || schoolsQuery.isError ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Latest Feedback</p>
                <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">Poslední zpětná vazba</h2>
              </div>
              <Button asChild variant="outline">
                <Link href="/feedback">Otevřít feedback</Link>
              </Button>
            </div>

            {feedbackQuery.isLoading ? (
              <p className="text-sm text-slate-500">Načítám poslední feedback...</p>
            ) : feedbackQuery.isError ? (
              <p className="text-sm text-rose-700">{getErrorMessage(feedbackQuery.error)}</p>
            ) : (
              <div className="space-y-3">
                {(feedbackQuery.data?.feedback ?? []).map((item) => (
                  <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      <span>{formatDateTime(item.createdAt)}</span>
                      <span>Rating {item.rating ?? "—"}</span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-900">{formatName([item.user?.givenName, item.user?.familyName])}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.message ?? "Bez textové zprávy"}</p>
                  </div>
                ))}
                {feedbackQuery.data?.feedback.length === 0 ? (
                  <p className="text-sm text-slate-500">Feedback endpoint je zatím prázdný.</p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Live Sections</p>
                  <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">Rychlé vstupy</h2>
              </div>
              <div className="grid gap-3">
                {liveLinks.map((item) => (
                  <Link key={item.label} href={item.href!} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-emerald-200 hover:bg-white">
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Session Snapshot</p>
                  <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">Přihlášený admin</h2>
                </div>
                <Badge className="bg-emerald-100 text-emerald-900">{(user?.roles ?? []).join(", ") || "bez role"}</Badge>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <p className="font-medium text-slate-900">{formatName([user?.givenName, user?.familyName])}</p>
                <p>{user?.email ?? "Bez e-mailu"}</p>
                <p>{user?.phone ?? "Bez telefonu"}</p>
              </div>
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Coming Soon</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {comingSoonNavigation.map((item) => (
                    <Badge key={item.label} variant="secondary" className="bg-slate-200 text-slate-700">
                      {item.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-3 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Catalog Snapshot</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Companies</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {companiesQuery.isLoading ? "…" : companiesQuery.isError ? "!" : companiesQuery.data?.companies.length ?? 0}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Schools</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {schoolsQuery.isLoading ? "…" : schoolsQuery.isError ? "!" : schoolsQuery.data?.schools.length ?? 0}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-sm text-slate-500">Faculty workflow</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Faculty přehled zůstává school-scoped, aby endpoint neběžel bez potřebného `schoolId`.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Button asChild variant="outline">
                  <Link href="/schools">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Otevřít školy
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
