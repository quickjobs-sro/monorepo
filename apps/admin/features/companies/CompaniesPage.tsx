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
import { fetchCompanies } from "./api";
import { companiesQueryKey } from "./queries";

export function CompaniesPage() {
  const [search, setSearch] = useState("");
  const companiesQuery = useQuery({
    queryKey: companiesQueryKey,
    queryFn: fetchCompanies,
  });

  const filteredCompanies = (companiesQuery.data?.companies ?? []).filter((company) => {
    const haystack = [company.name, company.location, company.shortDescription].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reference Data"
        title="Companies"
        description="Veřejný katalog firem jako read-only kontrolní pohled administrace."
        actions={
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Hledat firmu nebo lokaci"
            wrapperProps={{ className: "w-full max-w-xs" }}
          />
        }
      />

      {companiesQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám firmy...</CardContent>
        </Card>
      ) : companiesQuery.isError ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(companiesQuery.error)}</CardContent>
        </Card>
      ) : (
        <DataTable
          data={filteredCompanies}
          keyExtractor={(company) => String(company.id)}
          emptyMessage="Žádná firma neodpovídá aktuálnímu filtru."
          columns={[
            {
              header: "Firma",
              render: (company) => (
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">{company.name}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ID {company.id}</p>
                </div>
              ),
            },
            {
              header: "Lokace",
              render: (company) => <span>{company.location ?? "Neuvedeno"}</span>,
            },
            {
              header: "Popis",
              className: "min-w-[280px]",
              render: (company) => <span className="leading-6 text-slate-700">{company.shortDescription ?? "Bez popisu"}</span>,
            },
            {
              header: "Detail",
              render: (company) => (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/companies/${company.id}`}>Otevřít</Link>
                </Button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
