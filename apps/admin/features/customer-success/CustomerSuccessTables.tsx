import Link from "next/link";
import { SquareArrowOutUpRight } from "lucide-react";
import { Badge } from "@ui/components/core/badge";
import { Button } from "@ui/components/core/button";
import { DataTable } from "@/components/data-table/DataTable";
import { getSafeExternalUrl } from "@/features/companies/companyFormData";
import {
  formatCompactNumber,
  formatDateTime,
  formatJobTerm,
  formatRelativeDateTime,
} from "@/lib/formatting";
import {
  formatCompanyCriterionLabel,
  formatJobCriterionLabel,
} from "./params";
import type {
  AdminAnalyticsCompany,
  AdminAnalyticsJob,
  CompanyCriterion,
  JobCriterion,
} from "./types";

function CompanyCriterionBadges({
  criteria,
}: {
  criteria: CompanyCriterion[];
}) {
  if (criteria.length === 0) {
    return <Badge variant="secondary">Bez kritéria</Badge>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {criteria.map((criterion) => (
        <Badge
          key={criterion}
          className={
            criterion === "no_assigned_users"
              ? "bg-rose-100 text-rose-900 hover:bg-rose-100"
              : criterion === "no_recent_jobs"
                ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                : "bg-sky-100 text-sky-900 hover:bg-sky-100"
          }
        >
          {formatCompanyCriterionLabel(criterion)}
        </Badge>
      ))}
    </div>
  );
}

function JobCriterionBadges({ criteria }: { criteria: JobCriterion[] }) {
  if (criteria.length === 0) {
    return <Badge variant="secondary">Bez kritéria</Badge>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {criteria.map((criterion) => (
        <Badge
          key={criterion}
          className={
            criterion === "low_applications"
              ? "bg-rose-100 text-rose-900 hover:bg-rose-100"
              : criterion === "old_job"
                ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                : "bg-sky-100 text-sky-900 hover:bg-sky-100"
          }
        >
          {formatJobCriterionLabel(criterion)}
        </Badge>
      ))}
    </div>
  );
}

export function CompanyTable({
  companies,
}: {
  companies: AdminAnalyticsCompany[];
}) {
  return (
    <DataTable
      data={companies}
      keyExtractor={(company) => String(company.id)}
      emptyMessage="Aktuální risk filtr nevrátil žádné firmy."
      columns={[
        {
          header: "Firma",
          className: "min-w-[260px]",
          render: (company) => {
            const webUrl = getSafeExternalUrl(company.web);

            return (
              <div className="space-y-1">
                <p className="font-medium text-slate-900">{company.name}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  ID {company.id}
                </p>
                <p className="text-sm text-slate-600">
                  IČO: {company.ico ?? "—"}
                </p>
                {webUrl ? (
                  <a
                    className="text-sm text-emerald-700 underline-offset-4 hover:underline"
                    href={webUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {company.web}
                  </a>
                ) : (
                  <p className="text-sm text-slate-500">
                    {company.slug ?? "Bez webu"}
                  </p>
                )}
              </div>
            );
          },
        },
        {
          header: "Riziko",
          className: "min-w-[240px]",
          render: (company) => (
            <div className="space-y-2">
              <CompanyCriterionBadges criteria={company.matchedCriteria} />
              <p className="text-sm text-slate-600">
                Kritérií: {company.matchedCriteria.length}
              </p>
            </div>
          ),
        },
        {
          header: "Aktivita",
          className: "min-w-[230px]",
          render: (company) => (
            <div className="grid gap-1">
              <span>Recent joby: {formatCompactNumber(company.recentJobsCount)}</span>
              <span>
                Candidate search log:{" "}
                {formatCompactNumber(company.candidateSearchCount)}
              </span>
              <span className="text-xs text-slate-500">
                Candidate search je low-activity signál, ne přesný počet requestů.
              </span>
            </div>
          ),
        },
        {
          header: "Poslední signál",
          className: "min-w-[210px]",
          render: (company) => (
            <div className="space-y-1">
              <p>Job: {formatRelativeDateTime(company.lastJobCreatedAt)}</p>
              <p>Search: {formatRelativeDateTime(company.lastCandidateSearchAt)}</p>
              <p className="text-xs text-slate-500">
                Paid until: {company.paidUntil}
              </p>
            </div>
          ),
        },
        {
          header: "CS / Akce",
          className: "min-w-[220px]",
          render: (company) => {
            const hubspotUrl = getSafeExternalUrl(company.hubspotLink);

            return (
              <div className="space-y-2">
                <p className="text-sm">
                  Přiřazení userů:{" "}
                  <span className="font-medium text-slate-900">
                    {formatCompactNumber(company.assignedUserCount)}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {hubspotUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={hubspotUrl} target="_blank" rel="noreferrer">
                        HubSpot
                        <SquareArrowOutUpRight className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/companies/${company.id}`}>Detail</Link>
                  </Button>
                </div>
              </div>
            );
          },
        },
      ]}
    />
  );
}

export function JobTable({ jobs }: { jobs: AdminAnalyticsJob[] }) {
  return (
    <DataTable
      data={jobs}
      keyExtractor={(job) => String(job.id)}
      emptyMessage="Aktuální job filtr nevrátil žádné slabé joby."
      columns={[
        {
          header: "Job",
          className: "min-w-[280px]",
          render: (job) => (
            <div className="space-y-1">
              <p className="font-medium text-slate-900">
                {job.descriptionPreview ?? `Job #${job.id}`}
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                ID {job.id} · {formatJobTerm(job.term)}
              </p>
              <p className="text-sm text-slate-600">Status: {job.status}</p>
            </div>
          ),
        },
        {
          header: "Riziko",
          className: "min-w-[230px]",
          render: (job) => (
            <div className="space-y-2">
              <JobCriterionBadges criteria={job.matchedCriteria} />
              <p className="text-sm text-slate-600">
                Kritérií: {job.matchedCriteria.length}
              </p>
            </div>
          ),
        },
        {
          header: "Firma",
          render: (job) =>
            job.company ? (
              <div className="space-y-1">
                <Link
                  href={`/companies/${job.company.id}`}
                  className="font-medium text-emerald-700 underline-offset-4 hover:underline"
                >
                  {job.company.name}
                </Link>
                <p className="text-xs text-slate-500">
                  {job.company.slug ?? `ID ${job.company.id}`}
                </p>
              </div>
            ) : (
              <span className="text-slate-500">Bez firmy</span>
            ),
        },
        {
          header: "Výkon",
          className: "min-w-[180px]",
          render: (job) => (
            <div className="grid gap-1">
              <span>Reakce: {formatCompactNumber(job.appliedCount)}</span>
              <span>Detail visits: {formatCompactNumber(job.detailVisitCount)}</span>
              <span>Stáří: {formatCompactNumber(job.ageDays)} dní</span>
            </div>
          ),
        },
        {
          header: "Čas",
          className: "min-w-[210px]",
          render: (job) => (
            <div className="space-y-1">
              <p>Vytvořeno: {formatDateTime(job.createdAt)}</p>
              <p>Aktualizace: {formatRelativeDateTime(job.updatedAt)}</p>
              <p className="text-xs text-slate-500">
                Expirace: {formatDateTime(job.offerExpiresAt)}
              </p>
            </div>
          ),
        },
        {
          header: "Akce",
          render: (job) => (
            <Button asChild size="sm" variant="outline">
              <Link href={`/jobs/${job.id}`}>Detail jobu</Link>
            </Button>
          ),
        },
      ]}
    />
  );
}
