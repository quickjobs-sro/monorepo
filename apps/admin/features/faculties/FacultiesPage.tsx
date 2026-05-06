"use client";

import Link from "next/link";
import { useState } from "react";
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
import { DataTable } from "@/components/data-table/DataTable";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getErrorMessage } from "@/lib/errors";
import { fetchSchools } from "@/features/schools/api";
import { schoolsQueryKey } from "@/features/schools/queries";
import { fetchFacultiesBySchoolId } from "./api";
import { facultiesQueryKey } from "./queries";

export function FacultiesPage({
  initialSchoolId = "",
  initialSchoolName = "",
}: {
  initialSchoolId?: string;
  initialSchoolName?: string;
}) {
  const [schoolId, setSchoolId] = useState(initialSchoolId);
  const [search, setSearch] = useState("");

  const schoolsQuery = useQuery({
    queryKey: schoolsQueryKey,
    queryFn: fetchSchools,
  });

  const facultiesQuery = useQuery({
    queryKey: facultiesQueryKey(schoolId ? Number(schoolId) : null),
    queryFn: () => fetchFacultiesBySchoolId(Number(schoolId)),
    enabled: Boolean(schoolId),
  });

  const selectedSchoolName = schoolId
    ? schoolsQuery.data?.schools.find((school) => String(school.id) === schoolId)?.name ?? initialSchoolName
    : "";

  const filteredFaculties = (facultiesQuery.data?.faculties ?? []).filter((faculty) =>
    faculty.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reference Data"
        title="Faculties"
        description="Tenhle pohled je záměrně school-scoped. Bez vybrané školy se endpoint vůbec nespouští."
        actions={
          <>
            <Select value={schoolId} onValueChange={setSchoolId}>
              <SelectTrigger className="w-[240px] bg-white">
                <SelectValue placeholder="Vyber školu" />
              </SelectTrigger>
              <SelectContent>
                {(schoolsQuery.data?.schools ?? []).map((school) => (
                  <SelectItem key={school.id} value={String(school.id)}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filtrovat fakulty"
              wrapperProps={{ className: "w-full max-w-xs" }}
            />
          </>
        }
      />

      {!schoolId ? (
        <Card className="border-dashed border-slate-300/80 bg-white/80">
          <CardContent className="space-y-2 p-6 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Nejdřív vyber školu.</p>
            <p>Endpoint `/faculties` bez `schoolId` nedává použitelný výstup, takže v1 drží tenhle pohled striktně school-scoped.</p>
          </CardContent>
        </Card>
      ) : facultiesQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám fakulty pro vybranou školu...</CardContent>
        </Card>
      ) : facultiesQuery.isError ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(facultiesQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-white/80 bg-white/90">
            <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-slate-600">
              <span>Vybraná škola: {selectedSchoolName || schoolId}</span>
              <span>Počet fakult: {filteredFaculties.length}</span>
            </CardContent>
          </Card>
          <DataTable
            data={filteredFaculties}
            keyExtractor={(faculty) => String(faculty.id)}
            emptyMessage="Pro tuhle školu jsme nenašli žádné fakulty."
            columns={[
              {
                header: "Fakulta",
                render: (faculty) => <span className="font-medium text-slate-900">{faculty.name}</span>,
              },
              {
                header: "RIDF",
                render: (faculty) => <span>{faculty.ridf}</span>,
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
                    <Link href={`/faculties/${faculty.id}?schoolId=${schoolId}&schoolName=${encodeURIComponent(selectedSchoolName)}`}>
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
