"use client";

import Link from "next/link";
import { Clock3, MousePointerClick, Percent, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { MetricCard } from "@/components/admin-shell/MetricCard";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getErrorMessage } from "@/lib/errors";
import {
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
  formatJobTerm,
  formatName,
  formatPercent,
  formatRelativeDateTime,
} from "@/lib/formatting";
import { buildJobPerformanceSummary } from "./analytics";
import { fetchPublicJobDetail } from "./api";
import { jobDetailQueryKey } from "./queries";

export function JobDetailPage({ jobId }: { jobId: string }) {
  const jobDetailQuery = useQuery({
    queryKey: jobDetailQueryKey(jobId),
    queryFn: () => fetchPublicJobDetail(jobId),
  });

  const job = jobDetailQuery.data?.data;
  const stats = jobDetailQuery.data?.stats;
  const performance = job
    ? buildJobPerformanceSummary({
        job,
        stats,
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Jobs"
        title={job?.description ?? `Job #${jobId}`}
        description="Detail veřejné nabídky s analytics panelem čistě nad dnešním `/jobs/public/{id}` response."
        actions={
          <Button asChild variant="outline">
            <Link href="/jobs">Zpět na přehled</Link>
          </Button>
        }
      />

      {jobDetailQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám detail jobu...</CardContent>
        </Card>
      ) : jobDetailQuery.isError || !job ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(jobDetailQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-dashed border-slate-300/80 bg-white/80">
            <CardContent className="space-y-2 p-6 text-sm leading-6 text-slate-600">
              <p className="font-medium text-slate-900">Rozšířená job analytika je zatím limitovaná novým API.</p>
              <p>
                Detail ukazuje jen apply total, tracked visits a freshness ze současného backendu. Reject, ignore a
                saved metriky ze starého adminu tu záměrně nejsou, protože je nový endpoint nevystavuje.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <Card className="border-white/80 bg-white/90">
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <span>{formatJobTerm(job.term)}</span>
                    <span>{job.place?.address ?? "Bez adresy"}</span>
                  </div>
                  <div className="space-y-2">
                    <p className="font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                      {job.description}
                    </p>
                    <p className="text-sm leading-6 text-slate-600">
                      {job.author?.companyName ?? formatName([job.author?.givenName, job.author?.familyName])}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                    {job.description}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Mzda</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">
                        {job.salaryTo
                          ? `${formatCurrency(job.salary)} – ${formatCurrency(job.salaryTo)}`
                          : formatCurrency(job.salary)}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status summary</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{performance?.statusSummary ?? "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                  title="Apply Total"
                  value={formatCompactNumber(performance?.appliedTotal)}
                  hint="Celkový počet apply reakcí na tenhle job."
                  icon={Users}
                />
                <MetricCard
                  title="Job Visits"
                  value={formatCompactNumber(performance?.jobVisits)}
                  hint="Tracked návštěvy detailu nabídky."
                  icon={MousePointerClick}
                />
                <MetricCard
                  title="Conversion Proxy"
                  value={formatPercent(performance?.conversionRatio)}
                  hint="Apply total děleno tracked visits."
                  icon={Percent}
                  tone={performance?.jobVisits ? "default" : "warning"}
                />
                <MetricCard
                  title="Stats Freshness"
                  value={formatRelativeDateTime(performance?.freshnessAt)}
                  hint={formatDateTime(performance?.freshnessAt)}
                  icon={Clock3}
                  tone={performance?.freshnessAt ? "default" : "warning"}
                />
              </div>
            </div>

            <Card className="border-white/80 bg-white/90">
              <CardContent className="space-y-5 p-6 text-sm text-slate-700">
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Performance Summary</p>
                  <p className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-emerald-950">
                    {performance?.statusSummary ?? "—"}
                  </p>
                  <p className="mt-2 leading-6 text-emerald-900/80">
                    {performance?.jobVisits
                      ? `Job má ${formatCompactNumber(performance.jobVisits)} tracked visits a ${formatCompactNumber(
                          performance.appliedTotal
                        )} apply reakcí.`
                      : "Job zatím nemá žádné tracked návštěvy nebo backend stats ještě nic nevrátil."}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Autor</p>
                  <p className="mt-2 font-medium text-slate-950">
                    {job.author?.companyName ?? formatName([job.author?.givenName, job.author?.familyName])}
                  </p>
                  <p>{job.author?.email ?? "Bez e-mailu"}</p>
                  <p>{job.author?.phone ?? "Bez telefonu"}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Aktualizace</p>
                  <p className="mt-2">Job vytvořen: {formatDateTime(job.createdAt)}</p>
                  <p>Job aktualizován: {formatDateTime(job.updatedAt)}</p>
                  <p>Stats freshness: {formatDateTime(performance?.freshnessAt)}</p>
                  <p>Nabídka expirována: {formatDateTime(job.offerExpiresAt)}</p>
                </div>

                {job.url ? (
                  <Button asChild className="w-full">
                    <a href={job.url} target="_blank" rel="noreferrer">
                      Otevřít CTA URL
                    </a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
