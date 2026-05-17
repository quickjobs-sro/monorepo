"use client";

import { useState, type FormEvent } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  Layers3,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { MetricCard } from "@/components/admin-shell/MetricCard";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { formatCompactNumber } from "@/lib/formatting";
import { fetchCompanyAnalytics, fetchJobAnalytics } from "./api";
import {
  COMPANY_VIEW_LABELS,
  DEFAULT_COMPANY_DRAFT,
  DEFAULT_JOB_DRAFT,
  JOB_VIEW_LABELS,
  toCompanyQuery,
  toJobQuery,
} from "./config";
import { CustomerSuccessExportPanel } from "./CustomerSuccessExportPanel";
import { CompanyFilters, JobFilters } from "./CustomerSuccessFilters";
import { CompanyTable, JobTable } from "./CustomerSuccessTables";
import { getCustomerSuccessErrorMessage } from "./errors";
import {
  customerSuccessCompaniesQueryKey,
  customerSuccessJobsQueryKey,
} from "./queries";
import { CriteriaPills, SectionTitle, StateCard } from "./StatusBlocks";
import type { CompanyAnalyticsQuery, JobAnalyticsQuery } from "./types";

export function CustomerSuccessPage() {
  const [companyDraft, setCompanyDraft] = useState(DEFAULT_COMPANY_DRAFT);
  const [jobDraft, setJobDraft] = useState(DEFAULT_JOB_DRAFT);
  const [companyParams, setCompanyParams] = useState<CompanyAnalyticsQuery>(() =>
    toCompanyQuery(DEFAULT_COMPANY_DRAFT)
  );
  const [jobParams, setJobParams] = useState<JobAnalyticsQuery>(() =>
    toJobQuery(DEFAULT_JOB_DRAFT)
  );

  const companyQuery = useInfiniteQuery({
    queryKey: customerSuccessCompaniesQueryKey(companyParams),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      fetchCompanyAnalytics({
        ...companyParams,
        afterId: typeof pageParam === "number" ? pageParam : undefined,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pageInfo.hasNext) {
        return undefined;
      }

      return lastPage.items.at(-1)?.id;
    },
  });
  const jobQuery = useInfiniteQuery({
    queryKey: customerSuccessJobsQueryKey(jobParams),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      fetchJobAnalytics({
        ...jobParams,
        afterId: typeof pageParam === "number" ? pageParam : undefined,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pageInfo.hasNext) {
        return undefined;
      }

      return lastPage.items.at(-1)?.id;
    },
  });

  const companies = companyQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const jobs = jobQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const companyCriteria = companyQuery.data?.pages[0]?.criteria;
  const jobCriteria = jobQuery.data?.pages[0]?.criteria;

  function handleCompanySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCompanyParams(toCompanyQuery(companyDraft));
  }

  function handleJobSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJobParams(toJobQuery(jobDraft));
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Customer Success"
        description="Pracovní fronta nad admin analytics endpointy: paid firmy v riziku a aktivní interní joby se slabým výkonem. Každý pohled používá server-side filtraci a cursor pagination bez per-row detail requestů."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Načtené firmy"
          value={formatCompactNumber(companies.length)}
          hint="Součet aktuálně načtených stránek, ne celkový počet."
          icon={Building2}
          tone={companyQuery.isError ? "danger" : "default"}
        />
        <MetricCard
          title="Pohled firem"
          value={COMPANY_VIEW_LABELS[companyParams.view]}
          hint={companyQuery.hasNextPage ? "Další stránka k dispozici" : "Bez další stránky"}
          icon={Layers3}
          tone={companyQuery.hasNextPage ? "warning" : "default"}
        />
        <MetricCard
          title="Načtené joby"
          value={formatCompactNumber(jobs.length)}
          hint="Součet aktuálně načtených stránek, ne celkový počet."
          icon={BriefcaseBusiness}
          tone={jobQuery.isError ? "danger" : "default"}
        />
        <MetricCard
          title="Pohled jobů"
          value={JOB_VIEW_LABELS[jobParams.view]}
          hint={jobQuery.hasNextPage ? "Další stránka k dispozici" : "Bez další stránky"}
          icon={AlertTriangle}
          tone={jobQuery.hasNextPage ? "warning" : "default"}
        />
      </div>

      <section className="space-y-4">
        <SectionTitle
          eyebrow="Company Risk"
          title="Firmy v riziku"
          description="Dedikované listy slouží pro rychlou kontrolu jednoho problému, kombinované riziko používá `/admin/analytics/companies/at-risk` s AND semantikou přímo na backendu."
        />
        <CompanyFilters
          draft={companyDraft}
          onChange={setCompanyDraft}
          onSubmit={handleCompanySubmit}
        />

        {companyQuery.isLoading ? (
          <StateCard>Načítám firmy v riziku...</StateCard>
        ) : companyQuery.isError ? (
          <StateCard tone="danger">
            {getCustomerSuccessErrorMessage(companyQuery.error)}
          </StateCard>
        ) : (
          <>
            <CriteriaPills criteria={companyCriteria} />
            <CompanyTable companies={companies} />
            {companyQuery.hasNextPage ? (
              <Card className="border-white/80 bg-white/90">
                <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-slate-600">
                  <span>Načteno: {companies.length}</span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={companyQuery.isFetchingNextPage}
                    onClick={() => companyQuery.fetchNextPage()}
                  >
                    {companyQuery.isFetchingNextPage
                      ? "Načítám..."
                      : "Načíst další firmy"}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </section>

      <section className="space-y-4">
        <SectionTitle
          eyebrow="Job Risk"
          title="Slabé joby"
          description="Aktivní interní joby se slabou výkonností. Kombinovaný pohled volá `/admin/analytics/jobs/underperforming`, takže pagination odpovídá skutečnému backend výsledku."
        />
        <JobFilters
          draft={jobDraft}
          onChange={setJobDraft}
          onSubmit={handleJobSubmit}
        />

        {jobQuery.isLoading ? (
          <StateCard>Načítám slabé joby...</StateCard>
        ) : jobQuery.isError ? (
          <StateCard tone="danger">
            {getCustomerSuccessErrorMessage(jobQuery.error)}
          </StateCard>
        ) : (
          <>
            <CriteriaPills criteria={jobCriteria} />
            <JobTable jobs={jobs} />
            {jobQuery.hasNextPage ? (
              <Card className="border-white/80 bg-white/90">
                <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-slate-600">
                  <span>Načteno: {jobs.length}</span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={jobQuery.isFetchingNextPage}
                    onClick={() => jobQuery.fetchNextPage()}
                  >
                    {jobQuery.isFetchingNextPage
                      ? "Načítám..."
                      : "Načíst další joby"}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}

        <Card className="border-dashed border-slate-300/80 bg-white/80">
          <CardContent className="flex flex-wrap items-start gap-3 p-5 text-sm leading-6 text-slate-600">
            <MousePointerClick className="mt-1 h-4 w-4 text-emerald-700" />
            <p>
              `detailVisitCount` a `candidateSearchCount` jsou CS signály pro prioritu zásahu.
              Stránka záměrně nedotahuje detail každého řádku v cyklu, aby nevznikal N+1 provoz.
            </p>
          </CardContent>
        </Card>
      </section>

      <CustomerSuccessExportPanel
        companyParams={companyParams}
        jobParams={jobParams}
      />
    </div>
  );
}
