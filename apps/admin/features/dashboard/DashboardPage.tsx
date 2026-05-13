"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  HeartPulse,
  MousePointerClick,
  Search,
} from "lucide-react";
import { Badge } from "@ui/components/core/badge";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { MetricCard } from "@/components/admin-shell/MetricCard";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { comingSoonNavigation, navigationGroups } from "@/components/admin-shell/navigation";
import { getErrorMessage } from "@/lib/errors";
import {
  formatCompactNumber,
  formatDateTime,
  formatDecimal,
  formatName,
  formatPercent,
  formatRelativeDateTime,
} from "@/lib/formatting";
import { useAdminSession } from "@/features/auth/SessionProvider";
import { fetchPublicCompanies } from "@/features/companies/api";
import { publicCompaniesQueryKey } from "@/features/companies/queries";
import { fetchFeedback } from "@/features/feedback/api";
import { feedbackQueryKey } from "@/features/feedback/queries";
import { fetchCanonicalJobs } from "@/features/jobs/api";
import { jobsQueryKey } from "@/features/jobs/queries";
import { fetchSchools } from "@/features/schools/api";
import { schoolsQueryKey } from "@/features/schools/queries";
import { fetchHealth } from "@/features/system-health/api";
import { healthQueryKey } from "@/features/system-health/queries";
import { JOB_TERMS } from "@/lib/openapi/types";
import { buildDashboardKpiSnapshot, type DashboardRankedJob } from "./analytics";

const FEEDBACK_DASHBOARD_LIMIT = 20;
const FEEDBACK_PREVIEW_LIMIT = 5;

function getMetricValue(input: { isLoading: boolean; isError: boolean; value?: number | boolean | string | null }) {
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

function getFormattedMetric(input: { isLoading: boolean; isError: boolean; value: string }) {
  if (input.isLoading) {
    return "…";
  }

  if (input.isError) {
    return "Chyba";
  }

  return input.value;
}

function getRiskTone(input: { isError: boolean; count: number; activeTone: "warning" | "danger" }) {
  if (input.isError) {
    return "danger";
  }

  return input.count > 0 ? input.activeTone : "default";
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function InlineStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-950"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-slate-200 bg-slate-50 text-slate-950";

  return (
    <div className={`rounded-3xl border p-4 ${toneClass}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{hint}</p>
    </div>
  );
}

function RankedJobsList({
  title,
  rows,
  primaryLabel,
  secondaryLabel,
}: {
  title: string;
  rows: DashboardRankedJob[];
  primaryLabel: string;
  secondaryLabel: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-3 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">V aktuálně načteném řezu není co porovnat.</p>
        ) : (
          rows.map((row) => (
            <Link
              key={`${title}-${row.jobId}`}
              href={`/jobs/${row.jobId}`}
              className="block rounded-2xl border border-white bg-white px-3 py-3 transition hover:border-emerald-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{row.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{row.companyLabel}</p>
                </div>
                <div className="shrink-0 text-right text-sm text-slate-600">
                  <p className="font-semibold text-slate-950">
                    {primaryLabel}: {formatCompactNumber(row.value)}
                  </p>
                  <p>
                    {secondaryLabel}: {formatCompactNumber(row.secondaryValue)}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAdminSession();
  const healthQuery = useQuery({
    queryKey: healthQueryKey,
    queryFn: fetchHealth,
    retry: 0,
  });
  const feedbackQuery = useQuery({
    queryKey: feedbackQueryKey({ limit: FEEDBACK_DASHBOARD_LIMIT }),
    queryFn: () => fetchFeedback({ limit: FEEDBACK_DASHBOARD_LIMIT }),
  });
  const jobsQuery = useQuery({
    queryKey: jobsQueryKey([...JOB_TERMS]),
    queryFn: () => fetchCanonicalJobs({ term: [...JOB_TERMS] }),
  });
  const companiesQuery = useQuery({
    queryKey: publicCompaniesQueryKey,
    queryFn: fetchPublicCompanies,
  });
  const schoolsQuery = useQuery({
    queryKey: schoolsQueryKey,
    queryFn: fetchSchools,
  });

  const kpis = buildDashboardKpiSnapshot({
    jobs: jobsQuery.data?.data ?? [],
    companies: companiesQuery.data?.companies ?? [],
    schools: schoolsQuery.data?.schools ?? [],
    feedback: feedbackQuery.data?.feedback ?? [],
  });
  const previewFeedback = (feedbackQuery.data?.feedback ?? []).slice(0, FEEDBACK_PREVIEW_LIMIT);
  const liveLinks = navigationGroups.flatMap((group) => group.items.filter((item) => item.href));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Dashboard"
        description="Interní snapshot nad aktuálně načteným řezem OpenAPI dat. Dashboard nepoužívá detail requesty v cyklu ani broad candidate search."
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
          title="Jobs 30d"
          value={getFormattedMetric({
            isLoading: jobsQuery.isLoading,
            isError: jobsQuery.isError,
            value: formatCompactNumber(kpis.jobs.createdLast30Days),
          })}
          hint={jobsQuery.isError ? getErrorMessage(jobsQuery.error) : `${formatCompactNumber(kpis.jobs.createdLast7Days)} za posledních 7 dní`}
          icon={BriefcaseBusiness}
          tone={jobsQuery.isError ? "danger" : "default"}
        />
        <MetricCard
          title="Lifetime visits"
          value={getFormattedMetric({
            isLoading: jobsQuery.isLoading,
            isError: jobsQuery.isError,
            value: formatCompactNumber(kpis.jobs.lifetimeVisits),
          })}
          hint={jobsQuery.isError ? getErrorMessage(jobsQuery.error) : "Součet stats.jobVisits v načtených jobech"}
          icon={MousePointerClick}
          tone={jobsQuery.isError ? "danger" : "default"}
        />
        <MetricCard
          title="Catalog coverage"
          value={getMetricValue({
            isLoading: companiesQuery.isLoading || schoolsQuery.isLoading,
            isError: companiesQuery.isError || schoolsQuery.isError,
            value: kpis.catalog.companiesTotal + kpis.catalog.schoolsTotal,
          })}
          hint={
            companiesQuery.isError || schoolsQuery.isError
              ? "Část katalogu se nepodařila načíst"
              : `${formatCompactNumber(kpis.catalog.companiesTotal)} firem, ${formatCompactNumber(kpis.catalog.schoolsTotal)} škol`
          }
          icon={Building2}
          tone={companiesQuery.isError || schoolsQuery.isError ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <SectionTitle
                eyebrow="Job Pulse"
                title="Nové joby a aktivita"
                description="Klientská agregace nad `/v1/jobs`; časová okna vychází z `createdAt` v aktuálně načteném řezu."
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InlineStat
                  label="Joby celkem"
                  value={getFormattedMetric({
                    isLoading: jobsQuery.isLoading,
                    isError: jobsQuery.isError,
                    value: formatCompactNumber(kpis.jobs.total),
                  })}
                  hint={`${formatCompactNumber(kpis.jobs.createdLast30Days)} za 30 dní`}
                />
                <InlineStat
                  label="Apply total"
                  value={getFormattedMetric({
                    isLoading: jobsQuery.isLoading,
                    isError: jobsQuery.isError,
                    value: formatCompactNumber(kpis.jobs.appliedTotal),
                  })}
                  hint={`${formatCompactNumber(kpis.jobs.accepted)} accepted, ${formatCompactNumber(kpis.jobs.rejected)} rejected`}
                />
                <InlineStat
                  label="Bez návštěv"
                  value={getFormattedMetric({
                    isLoading: jobsQuery.isLoading,
                    isError: jobsQuery.isError,
                    value: formatCompactNumber(kpis.jobs.withoutVisits),
                  })}
                  hint="Joby se stats.jobVisits = 0"
                  tone={kpis.jobs.withoutVisits > 0 ? "warning" : "default"}
                />
                <InlineStat
                  label="Bez reakcí"
                  value={getFormattedMetric({
                    isLoading: jobsQuery.isLoading,
                    isError: jobsQuery.isError,
                    value: formatCompactNumber(kpis.jobs.withoutReactions),
                  })}
                  hint="Joby se stats.appliedTotal = 0"
                  tone={kpis.jobs.withoutReactions > 0 ? "warning" : "default"}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <SectionTitle
                eyebrow="Traffic & Conversion"
                title="Návštěvnost a konverze"
                description="Návštěvnost je lifetime `stats.jobVisits`; OpenAPI dnes neposkytuje visit timestamps ani date-range agregace."
              />
              <div className="grid gap-3 md:grid-cols-3">
                <InlineStat
                  label="Conversion proxy"
                  value={getFormattedMetric({
                    isLoading: jobsQuery.isLoading,
                    isError: jobsQuery.isError,
                    value: formatPercent(kpis.jobs.conversionRatio),
                  })}
                  hint="Apply total děleno visits"
                  tone={kpis.jobs.conversionRatio == null ? "warning" : "default"}
                />
                <InlineStat
                  label="Accepted rate"
                  value={getFormattedMetric({
                    isLoading: jobsQuery.isLoading,
                    isError: jobsQuery.isError,
                    value: formatPercent(kpis.jobs.acceptedRate),
                  })}
                  hint="Accepted děleno apply total"
                  tone={kpis.jobs.acceptedRate == null ? "warning" : "default"}
                />
                <InlineStat
                  label="Avg visits/job"
                  value={getFormattedMetric({
                    isLoading: jobsQuery.isLoading,
                    isError: jobsQuery.isError,
                    value: formatDecimal(kpis.jobs.total > 0 ? kpis.jobs.lifetimeVisits / kpis.jobs.total : null),
                  })}
                  hint="Průměr v aktuálním řezu"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <RankedJobsList
                  title="Top visited"
                  rows={kpis.jobs.topVisited}
                  primaryLabel="Visits"
                  secondaryLabel="Apply"
                />
                <RankedJobsList
                  title="Top apply"
                  rows={kpis.jobs.topApplied}
                  primaryLabel="Apply"
                  secondaryLabel="Visits"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <SectionTitle
                eyebrow="Operational Risks"
                title="Joby k operativní kontrole"
                description="Rizika jsou odvozená z list response: banned, relevance, expirace, nulové visits/apply a stats starší než 24 hodin."
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <InlineStat
                  label="Banned"
                  value={getFormattedMetric({
                    isLoading: jobsQuery.isLoading,
                    isError: jobsQuery.isError,
                    value: formatCompactNumber(kpis.jobs.banned),
                  })}
                  hint="Flag z canonical jobu"
                  tone={getRiskTone({ isError: jobsQuery.isError, count: kpis.jobs.banned, activeTone: "danger" })}
                />
                <InlineStat
                  label="Not relevant"
                  value={getFormattedMetric({
                    isLoading: jobsQuery.isLoading,
                    isError: jobsQuery.isError,
                    value: formatCompactNumber(kpis.jobs.notRelevant),
                  })}
                  hint="Viewer nebo job relevance"
                  tone={getRiskTone({ isError: jobsQuery.isError, count: kpis.jobs.notRelevant, activeTone: "warning" })}
                />
                <InlineStat
                  label="Expired"
                  value={getFormattedMetric({
                    isLoading: jobsQuery.isLoading,
                    isError: jobsQuery.isError,
                    value: formatCompactNumber(kpis.jobs.expiredOffers),
                  })}
                  hint="Offer po expiraci"
                  tone={getRiskTone({ isError: jobsQuery.isError, count: kpis.jobs.expiredOffers, activeTone: "danger" })}
                />
                <InlineStat
                  label="Expiring 7d"
                  value={getFormattedMetric({
                    isLoading: jobsQuery.isLoading,
                    isError: jobsQuery.isError,
                    value: formatCompactNumber(kpis.jobs.expiringOffers7Days),
                  })}
                  hint="Offer končí do 7 dní"
                  tone={getRiskTone({ isError: jobsQuery.isError, count: kpis.jobs.expiringOffers7Days, activeTone: "warning" })}
                />
                <InlineStat
                  label="Stale stats"
                  value={getFormattedMetric({
                    isLoading: jobsQuery.isLoading,
                    isError: jobsQuery.isError,
                    value: formatCompactNumber(kpis.jobs.staleStats),
                  })}
                  hint="Stats starší než 24 h"
                  tone={getRiskTone({ isError: jobsQuery.isError, count: kpis.jobs.staleStats, activeTone: "warning" })}
                />
              </div>

              {jobsQuery.isLoading ? (
                <p className="text-sm text-slate-500">Načítám job risk výřez...</p>
              ) : jobsQuery.isError ? (
                <p className="text-sm text-rose-700">{getErrorMessage(jobsQuery.error)}</p>
              ) : kpis.jobs.riskJobs.length === 0 ? (
                <p className="text-sm text-slate-500">V aktuálně načteném řezu nejsou žádné výrazné job risk signály.</p>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {kpis.jobs.riskJobs.map((job) => (
                    <Link
                      key={job.jobId}
                      href={`/jobs/${job.jobId}`}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{job.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{job.companyLabel}</p>
                        </div>
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {job.reasons.map((reason) => (
                          <Badge key={reason} className="bg-white text-slate-800">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <span>Visits: {formatCompactNumber(job.jobVisits)}</span>
                        <span>Apply: {formatCompactNumber(job.appliedTotal)}</span>
                        <span>Offer: {formatDateTime(job.offerExpiresAt)}</span>
                        <span>Stats: {formatRelativeDateTime(job.statsUpdatedAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <SectionTitle
                  eyebrow="Feedback Pulse"
                  title="Zpětná vazba"
                  description="Poslední stránka z `/admin/feedback`; dashboard načítá 20 položek a zobrazuje náhled pěti."
                />
                <Button asChild variant="outline">
                  <Link href="/feedback">Otevřít</Link>
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <InlineStat
                  label="Avg rating"
                  value={getFormattedMetric({
                    isLoading: feedbackQuery.isLoading,
                    isError: feedbackQuery.isError,
                    value: formatDecimal(kpis.feedback.averageRating),
                  })}
                  hint={`${formatCompactNumber(kpis.feedback.ratedTotal)} hodnocení`}
                />
                <InlineStat
                  label="Low ratings"
                  value={getFormattedMetric({
                    isLoading: feedbackQuery.isLoading,
                    isError: feedbackQuery.isError,
                    value: formatCompactNumber(kpis.feedback.lowRatings),
                  })}
                  hint="Rating <= 2"
                  tone={kpis.feedback.lowRatings > 0 ? "warning" : "default"}
                />
                <InlineStat
                  label="Latest"
                  value={getFormattedMetric({
                    isLoading: feedbackQuery.isLoading,
                    isError: feedbackQuery.isError,
                    value: formatRelativeDateTime(kpis.feedback.latestFeedbackAt),
                  })}
                  hint={formatDateTime(kpis.feedback.latestFeedbackAt)}
                />
              </div>

              {feedbackQuery.isLoading ? (
                <p className="text-sm text-slate-500">Načítám poslední feedback...</p>
              ) : feedbackQuery.isError ? (
                <p className="text-sm text-rose-700">{getErrorMessage(feedbackQuery.error)}</p>
              ) : previewFeedback.length === 0 ? (
                <p className="text-sm text-slate-500">Feedback endpoint je zatím prázdný.</p>
              ) : (
                <div className="space-y-3">
                  {previewFeedback.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        <span>{formatDateTime(item.createdAt)}</span>
                        <span>Rating {item.rating ?? "—"}</span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-900">{formatName([item.user?.givenName, item.user?.familyName])}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.message ?? "Bez textové zprávy"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <SectionTitle
                eyebrow="Catalog Quality"
                title="Kvalita katalogu"
                description="Lehký audit list response z firem a škol bez detail requestů."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <InlineStat
                  label="Missing logo"
                  value={getFormattedMetric({
                    isLoading: companiesQuery.isLoading,
                    isError: companiesQuery.isError,
                    value: formatCompactNumber(kpis.catalog.companiesMissingLogo),
                  })}
                  hint="Firmy bez loga"
                  tone={kpis.catalog.companiesMissingLogo > 0 ? "warning" : "default"}
                />
                <InlineStat
                  label="Missing web"
                  value={getFormattedMetric({
                    isLoading: companiesQuery.isLoading,
                    isError: companiesQuery.isError,
                    value: formatCompactNumber(kpis.catalog.companiesMissingWeb),
                  })}
                  hint="Firmy bez webu"
                  tone={kpis.catalog.companiesMissingWeb > 0 ? "warning" : "default"}
                />
                <InlineStat
                  label="Missing contact"
                  value={getFormattedMetric({
                    isLoading: companiesQuery.isLoading,
                    isError: companiesQuery.isError,
                    value: formatCompactNumber(kpis.catalog.companiesMissingContact),
                  })}
                  hint="Firmy bez kontaktu"
                  tone={kpis.catalog.companiesMissingContact > 0 ? "warning" : "default"}
                />
                <InlineStat
                  label="School cities"
                  value={getFormattedMetric({
                    isLoading: schoolsQuery.isLoading,
                    isError: schoolsQuery.isError,
                    value: formatCompactNumber(kpis.catalog.schoolCitiesTotal),
                  })}
                  hint={`${formatCompactNumber(kpis.catalog.schoolsTotal)} škol celkem`}
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild variant="outline">
                  <Link href="/companies">
                    <Building2 className="mr-2 h-4 w-4" />
                    Firmy
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/schools">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Školy
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <SectionTitle
                eyebrow="Candidate Registrations"
                title="Registrace kandidátů"
                description="OpenAPI dnes nemá levný admin agregát registrací. Broad `/v1/candidates` search se nespouští automaticky kvůli zátěži a PII."
              />
              <Button asChild variant="outline">
                <Link href="/candidates">
                  <Search className="mr-2 h-4 w-4" />
                  Otevřít ruční search
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <SectionTitle eyebrow="Live Sections" title="Rychlé vstupy" description="Sekce dostupné v read-only administraci." />
              <div className="grid gap-3">
                {liveLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href!}
                    className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-emerald-200 hover:bg-white"
                  >
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
                <SectionTitle eyebrow="Session Snapshot" title="Přihlášený admin" description="Aktuální admin session." />
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
        </div>
      </div>
    </div>
  );
}
