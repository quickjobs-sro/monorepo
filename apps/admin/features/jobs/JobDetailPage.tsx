"use client";

import Link from "next/link";
import { Clock3, MousePointerClick, Percent, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@ui/components/core/badge";
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
import { fetchCanonicalJobDetail, fetchJobDispatches } from "./api";
import { jobDetailQueryKey, jobDispatchesQueryKey } from "./queries";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatObjectLabel(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (!isRecord(value)) {
    return "—";
  }

  const candidate = value.name ?? value.label ?? value.status ?? value.value ?? value.id;
  if (typeof candidate === "string" || typeof candidate === "number" || typeof candidate === "boolean") {
    return String(candidate);
  }

  const keys = Object.keys(value);
  return keys.length ? keys.join(", ") : "—";
}

export function JobDetailPage({ jobId }: { jobId: string }) {
  const jobDetailQuery = useQuery({
    queryKey: jobDetailQueryKey(jobId),
    queryFn: () => fetchCanonicalJobDetail(jobId),
  });
  const dispatchesQuery = useQuery({
    queryKey: jobDispatchesQueryKey(jobId),
    queryFn: () => fetchJobDispatches(jobId),
  });

  const job = jobDetailQuery.data?.data;
  const stats = job?.stats;
  const performance = job
    ? buildJobPerformanceSummary({
        job,
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Jobs"
        title={job?.description ?? `Job #${jobId}`}
        description="Canonical detail z `/v1/jobs/{id}` s read-only dispatch auditem push notifikací."
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
              <p className="font-medium text-slate-900">Read-only administrátorský detail.</p>
              <p>
                Detail používá canonical stats, expirace, banned/relevance flagy a samostatný audit dispatchů.
                Neobsahuje resend ani send akce, protože první vlna adminu je bez mutací.
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
                    <span>Status: {formatObjectLabel(job.status)}</span>
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
                  <div className="flex flex-wrap gap-2">
                    {performance?.isBanned ? <Badge className="bg-rose-100 text-rose-900">Banned</Badge> : null}
                    <Badge className="bg-slate-100 text-slate-800">
                      Relevant: {performance?.isRelevant === false ? "ne" : "ano"}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-800">Author ID {job.authorId}</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                  title="Reaction Total"
                  value={formatCompactNumber(performance?.total)}
                  hint="Canonical total pro tenhle job."
                  icon={Users}
                />
                <MetricCard
                  title="Applied"
                  value={formatCompactNumber(performance?.applied)}
                  hint="Canonical applied stav pro tenhle job."
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

              <Card className="border-white/80 bg-white/90">
                <CardContent className="space-y-4 p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Canonical Stats</p>
                    <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                      Reakce podle stavu
                    </h2>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Accepted</p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">{formatCompactNumber(stats?.accepted)}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Ignored</p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">{formatCompactNumber(stats?.ignored)}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Rejected</p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">{formatCompactNumber(stats?.rejected)}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Stats updated</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{formatDateTime(stats?.updatedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  <p>Kandidáti dostupní do: {formatDateTime(job.candidatesAccessExpiresAt)}</p>
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

          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Push Dispatch Audit</p>
                <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                  Historie notifikací
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Read-only stav dispatchů z `/v1/push-notifications/jobs/{jobId}/dispatches`.
                </p>
              </div>

              {dispatchesQuery.isLoading ? (
                <p className="text-sm text-slate-500">Načítám dispatch audit...</p>
              ) : dispatchesQuery.isError ? (
                <p className="text-sm text-rose-700">{getErrorMessage(dispatchesQuery.error)}</p>
              ) : (dispatchesQuery.data?.dispatches ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">Pro tenhle job nejsou evidované žádné dispatch záznamy.</p>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {(dispatchesQuery.data?.dispatches ?? []).map((dispatch) => (
                    <div key={dispatch.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">{dispatch.dispatchType}</p>
                          <p className="text-sm text-slate-600">{dispatch.status}</p>
                        </div>
                        <Badge className="bg-white text-slate-800">
                          {formatCompactNumber(dispatch.totalRecipients)} recipients
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <span>Success: {formatCompactNumber(dispatch.successCount)}</span>
                        <span>Failure: {formatCompactNumber(dispatch.failureCount)}</span>
                        <span>Scheduled: {formatDateTime(dispatch.scheduledAt)}</span>
                        <span>Completed: {formatDateTime(dispatch.completedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
