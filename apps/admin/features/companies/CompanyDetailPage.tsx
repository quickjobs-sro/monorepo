"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { DataTable } from "@/components/data-table/DataTable";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/formatting";
import { fetchCompanyDetail } from "./api";
import { companyDetailQueryKey } from "./queries";

export function CompanyDetailPage({ companyId }: { companyId: string }) {
  const companyDetailQuery = useQuery({
    queryKey: companyDetailQueryKey(companyId),
    queryFn: () => fetchCompanyDetail(companyId),
  });

  const detail = companyDetailQuery.data;
  const company = detail?.data;
  const statsMap = new Map((detail?.stats ?? []).map((stat) => [stat.jobId, stat]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Companies"
        title={company?.name ?? `Company #${companyId}`}
        description="Detail firmy a navázaných veřejných jobů z jednoho endpointu."
        actions={
          <Button asChild variant="outline">
            <Link href="/companies">Zpět na firmy</Link>
          </Button>
        }
      />

      {companyDetailQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám detail firmy...</CardContent>
        </Card>
      ) : companyDetailQuery.isError || !company ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(companyDetailQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-white/80 bg-white/90">
            <CardContent className="grid gap-4 p-6 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Název</p>
                <p className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">{company.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Lokace</p>
                <p className="mt-2 text-slate-700">{company.location ?? "Neuvedeno"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Slug</p>
                <p className="mt-2 text-slate-700">{company.slug ?? "Bez slugu"}</p>
              </div>
            </CardContent>
          </Card>

          <DataTable
            data={detail?.jobs ?? []}
            keyExtractor={(job) => String(job.id)}
            emptyMessage="K firmě nejsou navázané žádné veřejné joby."
            columns={[
              {
                header: "Job",
                className: "min-w-[260px]",
                render: (job) => <span className="font-medium text-slate-900">{job.description}</span>,
              },
              {
                header: "Přihlášky",
                render: (job) => <span>{statsMap.get(job.id)?.appliedTotal ?? "—"}</span>,
              },
              {
                header: "Aktualizováno",
                render: (job) => <span>{formatDateTime(job.updatedAt)}</span>,
              },
              {
                header: "Detail",
                render: (job) => (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/jobs/${job.id}`}>Job detail</Link>
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
