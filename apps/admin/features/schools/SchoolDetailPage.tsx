"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { DataTable } from "@/components/data-table/DataTable";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getErrorMessage } from "@/lib/errors";
import { fetchSchoolDetail } from "./api";
import { schoolDetailQueryKey } from "./queries";

export function SchoolDetailPage({ schoolId }: { schoolId: string }) {
  const schoolDetailQuery = useQuery({
    queryKey: schoolDetailQueryKey(schoolId),
    queryFn: () => fetchSchoolDetail(schoolId),
  });

  const school = schoolDetailQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Schools"
        title={school?.name ?? `School #${schoolId}`}
        description="Detail školy včetně fakult z jednoho backend response."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/schools">Zpět na školy</Link>
            </Button>
            <Button asChild>
              <Link href={`/faculties?schoolId=${schoolId}&schoolName=${encodeURIComponent(school?.name ?? "")}`}>
                Otevřít school-scoped fakulty
              </Link>
            </Button>
          </div>
        }
      />

      {schoolDetailQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám detail školy...</CardContent>
        </Card>
      ) : schoolDetailQuery.isError || !school ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(schoolDetailQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-white/80 bg-white/90">
            <CardContent className="grid gap-4 p-6 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Název</p>
                <p className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">{school.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Město</p>
                <p className="mt-2 text-slate-700">{school.city}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">RID</p>
                <p className="mt-2 text-slate-700">{school.rid}</p>
              </div>
            </CardContent>
          </Card>

          <DataTable
            data={school.faculties ?? []}
            keyExtractor={(faculty) => String(faculty.id)}
            emptyMessage="Backend škole zatím nepřiřadil žádné fakulty."
            columns={[
              {
                header: "Fakulta",
                render: (faculty) => <span className="font-medium text-slate-900">{faculty.name}</span>,
              },
              {
                header: "Web",
                render: (faculty) =>
                  faculty.www ? (
                    <a className="text-emerald-700 underline-offset-4 hover:underline" href={faculty.www} target="_blank" rel="noreferrer">
                      Otevřít
                    </a>
                  ) : (
                    "—"
                  ),
              },
              {
                header: "Detail",
                render: (faculty) => (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/faculties/${faculty.id}?schoolId=${school.id}&schoolName=${encodeURIComponent(school.name)}`}
                    >
                      Otevřít
                    </Link>
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
