"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, BriefcaseBusiness, Clock3, MousePointerClick, Percent, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { Input } from "@ui/components/core/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/core/select";
import { MetricCard } from "@/components/admin-shell/MetricCard";
import { DataTable } from "@/components/data-table/DataTable";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getErrorMessage } from "@/lib/errors";
import {
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
  formatDecimal,
  formatJobTerm,
  formatName,
  formatPercent,
  formatRelativeDateTime,
} from "@/lib/formatting";
import { JOB_TERMS, type PublicJobStats } from "@/lib/openapi/types";
import { buildJobAnalyticsSnapshot, buildJobPerformanceSummary } from "./analytics";
import { fetchPublicJobs } from "./api";
import { jobsQueryKey } from "./queries";
import type { JobPerformanceSummary, JobsTermFilter, RankedJobMetricRow } from "./types";

function getStatsMap(stats: PublicJobStats[]) {
  return new Map(stats.map((stat) => [stat.jobId, stat]));
}

function RankedJobsCard({
  title,
  description,
  rows,
  primaryLabel,
  secondaryLabel,
}: {
  title: string;
  description: string;
  rows: RankedJobMetricRow[];
  primaryLabel: string;
  secondaryLabel: string;
}) {
  return (
    <Card className="border-white/80 bg-white/90">
      <CardContent className="space-y-4 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">V aktuálním řezu zatím není co porovnat.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <Link
                key={`${row.metric}-${row.jobId}`}
                href={`/jobs/${row.jobId}`}
                className="block rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{row.title}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatJobTerm(row.term)}</p>
                    <p className="text-sm text-slate-600">{row.companyLabel}</p>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">
                      {primaryLabel}: {formatCompactNumber(row.primaryValue)}
                    </p>
                    <p>
                      {secondaryLabel}: {formatCompactNumber(row.secondaryValue)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LowEngagementCard({ items }: { items: JobPerformanceSummary[] }) {
  return (
    <Card className="border-white/80 bg-white/90">
      <CardContent className="space-y-4 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Low Engagement</p>
          <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
            Slabé joby a nulová reakce
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Výřez jobů, které zatím nemají návštěvy, nemají reakce, nebo mají nesoulad mezi tracked visits a apply.
          </p>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Ve vybraném řezu není žádný job s nulovou engagement.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <Link
                key={item.jobId}
                href={`/jobs/${item.jobId}`}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-white"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.companyLabel}</p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatJobTerm(item.term)}</p>
                  </div>
                  <p className="text-sm font-medium text-amber-800">{item.statusSummary}</p>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>Apply: {formatCompactNumber(item.appliedTotal)}</span>
                    <span>Visits: {formatCompactNumber(item.jobVisits)}</span>
                    <span>Konverze: {formatPercent(item.conversionRatio)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function JobsPage() {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState<JobsTermFilter>("all");
  const activeTerms = term === "all" ? [...JOB_TERMS] : [term];

  const jobsQuery = useQuery({
    queryKey: jobsQueryKey(activeTerms),
    queryFn: () =>
      fetchPublicJobs({
        term: activeTerms,
      }),
  });

  const statsMap = getStatsMap(jobsQuery.data?.stats ?? []);
  const filteredJobs = (jobsQuery.data?.jobs ?? []).filter((job) => {
    const haystack = [
      job.description,
      job.author?.companyName,
      job.author?.email,
      job.author?.givenName,
      job.author?.familyName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search.trim().toLowerCase());
  });
  const tableRows = filteredJobs.map((job) => {
    const stats = statsMap.get(job.id);
    return {
      job,
      stats,
      performance: buildJobPerformanceSummary({
        job,
        stats,
      }),
    };
  });
  const analytics = buildJobAnalyticsSnapshot(
    filteredJobs.map((job) => ({
      job,
      stats: statsMap.get(job.id),
    }))
  );
  const searchLabel = search.trim() ? `Search: “${search.trim()}”` : "Search: bez lokálního filtru";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Jobs Overview"
        description="Read-only analytický pohled nad `/jobs/public`. Používáme jen metriky, které dnešní backend opravdu vrací: apply total, visits a freshness."
        actions={
          <>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hledat v jobech nebo firmě"
              wrapperProps={{ className: "w-full max-w-xs" }}
            />
            <Select value={term} onValueChange={(value) => setTerm(value as JobsTermFilter)}>
              <SelectTrigger className="w-[170px] bg-white">
                <SelectValue placeholder="Typ práce" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny termy</SelectItem>
                <SelectItem value="one_time">Jednorázově</SelectItem>
                <SelectItem value="long_term">Dlouhodobě</SelectItem>
                <SelectItem value="full_time">Plný úvazek</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {jobsQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám joby...</CardContent>
        </Card>
      ) : jobsQuery.isError ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(jobsQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-white/80 bg-white/90">
            <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-slate-600">
              <span>Jobů v načteném řezu: {analytics.jobsCount}</span>
              <span>Term filter: {term === "all" ? "všechny" : formatJobTerm(term)}</span>
              <span>{searchLabel}</span>
            </CardContent>
          </Card>

          <Card className="border-dashed border-slate-300/80 bg-white/80">
            <CardContent className="space-y-2 p-6 text-sm leading-6 text-slate-600">
              <p className="font-medium text-slate-900">Analytics jen z nového API.</p>
              <p>
                Tohle je čistě read-only analytika nad dnešními `stats` z `/jobs/public`. Staré metriky jako reject,
                ignore nebo saved backend zatím nevystavuje, takže je v adminu záměrně nepředstíráme.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Jobs in selection"
              value={formatCompactNumber(analytics.jobsCount)}
              hint="Počet jobů po term filtru a lokálním searchi."
              icon={BriefcaseBusiness}
            />
            <MetricCard
              title="Apply Total"
              value={formatCompactNumber(analytics.appliedTotal)}
              hint="Součet všech apply reakcí v aktuálním řezu."
              icon={Users}
            />
            <MetricCard
              title="Job Visits"
              value={formatCompactNumber(analytics.jobVisits)}
              hint="Součet tracked návštěv detailu nabídky."
              icon={MousePointerClick}
            />
            <MetricCard
              title="Avg Apply / Job"
              value={formatDecimal(analytics.averageAppliesPerJob)}
              hint="Průměrný apply total na jednu nabídku."
              icon={Activity}
            />
            <MetricCard
              title="Avg Visits / Job"
              value={formatDecimal(analytics.averageVisitsPerJob)}
              hint="Průměrný počet tracked visits na job."
              icon={Clock3}
            />
            <MetricCard
              title="Conversion Proxy"
              value={formatPercent(analytics.conversionRatio)}
              hint="Apply total děleno tracked visits tam, kde visits > 0."
              icon={Percent}
              tone={analytics.jobVisits === 0 ? "warning" : "default"}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="border-white/80 bg-white/90">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">By Term</p>
                  <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                    Breakdown podle typu
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Snapshot po termech nad aktuálně načtenými joby a jejich stats.
                  </p>
                </div>
                <div className="space-y-3">
                  {analytics.termBreakdown.map((termRow) => (
                    <div key={termRow.term} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">{formatJobTerm(termRow.term)}</p>
                          <p className="mt-1 text-sm text-slate-600">{termRow.jobsCount} jobů v řezu</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{formatPercent(termRow.conversionRatio)}</p>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <span>Apply: {formatCompactNumber(termRow.appliedTotal)}</span>
                        <span>Visits: {formatCompactNumber(termRow.jobVisits)}</span>
                        <span>Avg apply/job: {formatDecimal(termRow.averageAppliesPerJob)}</span>
                        <span>Avg visits/job: {formatDecimal(termRow.averageVisitsPerJob)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <RankedJobsCard
              title="Top Apply"
              description="Joby s největším počtem apply reakcí v aktuálním řezu."
              rows={analytics.topAppliedJobs}
              primaryLabel="Apply"
              secondaryLabel="Visits"
            />

            <RankedJobsCard
              title="Top Visits"
              description="Joby, které přitáhly nejvíc tracked návštěv detailu."
              rows={analytics.topVisitedJobs}
              primaryLabel="Visits"
              secondaryLabel="Apply"
            />
          </div>

          <LowEngagementCard items={analytics.lowEngagementJobs} />

          <DataTable
            data={tableRows}
            keyExtractor={(row) => String(row.job.id)}
            emptyMessage="Aktuální výběr nevrátil žádné joby."
            columns={[
              {
                header: "Pozice",
                className: "min-w-[300px]",
                render: (row) => (
                  <div className="space-y-2">
                    <p className="font-medium text-slate-900">{row.job.description}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatJobTerm(row.job.term)}</p>
                    <p className="text-sm text-slate-600">{row.performance.statusSummary}</p>
                  </div>
                ),
              },
              {
                header: "Firma",
                render: (row) => (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">
                      {row.job.author?.companyName ?? formatName([row.job.author?.givenName, row.job.author?.familyName])}
                    </p>
                    <p className="text-xs text-slate-500">{row.job.author?.email ?? "Bez e-mailu"}</p>
                  </div>
                ),
              },
              {
                header: "Mzda",
                render: (row) => (
                  <div>
                    {row.job.salaryTo
                      ? `${formatCurrency(row.job.salary)} – ${formatCurrency(row.job.salaryTo)}`
                      : formatCurrency(row.job.salary)}
                  </div>
                ),
              },
              {
                header: "Přihlášky",
                render: (row) => <span>{formatCompactNumber(row.performance.appliedTotal)}</span>,
              },
              {
                header: "Visits",
                render: (row) => <span>{formatCompactNumber(row.performance.jobVisits)}</span>,
              },
              {
                header: "Konverze",
                render: (row) => <span>{formatPercent(row.performance.conversionRatio)}</span>,
              },
              {
                header: "Freshness",
                className: "min-w-[210px]",
                render: (row) => (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{formatRelativeDateTime(row.performance.freshnessAt)}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(row.performance.freshnessAt)}</p>
                  </div>
                ),
              },
              {
                header: "Detail",
                render: (row) => (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/jobs/${row.job.id}`}>Otevřít</Link>
                  </Button>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
