"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { Input } from "@ui/components/core/input";
import { DataTable } from "@/components/data-table/DataTable";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getErrorMessage } from "@/lib/errors";
import { fetchSchools } from "./api";
import { schoolsQueryKey } from "./queries";

function formatSchoolType(type: number) {
  return `Typ ${type}`;
}

export function SchoolsPage() {
  const [search, setSearch] = useState("");
  const schoolsQuery = useQuery({
    queryKey: schoolsQueryKey,
    queryFn: fetchSchools,
  });

  const filteredSchools = (schoolsQuery.data?.schools ?? []).filter((school) => {
    const haystack = [school.name, school.city, school.www].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reference Data"
        title="Schools"
        description="Přehled škol a deep-link do detailu s fakultami, bez dalších skládaných callů."
        actions={
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Hledat školu nebo město"
            wrapperProps={{ className: "w-full max-w-xs" }}
          />
        }
      />

      {schoolsQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám školy...</CardContent>
        </Card>
      ) : schoolsQuery.isError ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(schoolsQuery.error)}</CardContent>
        </Card>
      ) : (
        <DataTable
          data={filteredSchools}
          keyExtractor={(school) => String(school.id)}
          emptyMessage="Žádná škola neodpovídá aktuálnímu filtru."
          columns={[
            {
              header: "Škola",
              className: "min-w-[260px]",
              render: (school) => (
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">{school.name}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatSchoolType(school.type)}</p>
                </div>
              ),
            },
            {
              header: "Město",
              render: (school) => <span>{school.city}</span>,
            },
            {
              header: "Web",
              render: (school) =>
                school.www ? (
                  <a className="text-emerald-700 underline-offset-4 hover:underline" href={school.www} target="_blank" rel="noreferrer">
                    Otevřít
                  </a>
                ) : (
                  "—"
                ),
            },
            {
              header: "Detail",
              render: (school) => (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/schools/${school.id}`}>Otevřít</Link>
                </Button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
