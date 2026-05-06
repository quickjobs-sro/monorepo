"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getErrorMessage } from "@/lib/errors";
import { fetchFacultyDetail } from "./api";
import { facultyDetailQueryKey } from "./queries";

export function FacultyDetailPage({
  facultyId,
  schoolId,
  schoolName,
}: {
  facultyId: string;
  schoolId?: string;
  schoolName?: string;
}) {
  const facultyDetailQuery = useQuery({
    queryKey: facultyDetailQueryKey(facultyId),
    queryFn: () => fetchFacultyDetail(facultyId),
  });

  const faculty = facultyDetailQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Faculties"
        title={faculty?.name ?? `Faculty #${facultyId}`}
        description="Detail fakulty z dedikovaného endpointu, s návratem do school-scoped seznamu."
        actions={
          <Button asChild variant="outline">
            <Link href={schoolId ? `/faculties?schoolId=${schoolId}&schoolName=${encodeURIComponent(schoolName ?? "")}` : "/faculties"}>
              Zpět na fakulty
            </Link>
          </Button>
        }
      />

      {facultyDetailQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám detail fakulty...</CardContent>
        </Card>
      ) : facultyDetailQuery.isError || !faculty ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(facultyDetailQuery.error)}</CardContent>
        </Card>
      ) : (
        <Card className="border-white/80 bg-white/90">
          <CardContent className="grid gap-4 p-6 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Název</p>
              <p className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">{faculty.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">RIDF</p>
              <p className="mt-2 text-slate-700">{faculty.ridf}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Web</p>
              {faculty.www ? (
                <a className="mt-2 inline-block text-emerald-700 underline-offset-4 hover:underline" href={faculty.www} target="_blank" rel="noreferrer">
                  {faculty.www}
                </a>
              ) : (
                <p className="mt-2 text-slate-700">Bez webu</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
