"use client";

/* eslint-disable no-unused-vars */
import { FormEvent, useEffect, useState } from "react";
import { Building2, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/core/button";
import { Input } from "@ui/components/core/input";
import { getErrorMessage } from "@/lib/errors";
import type { AdminCompanyListItem } from "@/lib/openapi/types";
import { fetchCompanies } from "./api";
import { companyPickerQueryKey } from "./queries";

const COMPANY_PICKER_LIMIT = 20;

export type CompanyPickerSelection = {
  id: number;
  name: string;
};

type CompanyPickerProps = {
  selectedCompany: CompanyPickerSelection | null;
  onSelect(company: CompanyPickerSelection | null): void;
};

function toSelection(company: AdminCompanyListItem): CompanyPickerSelection {
  return {
    id: company.id,
    name: company.name,
  };
}

export function CompanyPicker({ selectedCompany, onSelect }: CompanyPickerProps) {
  const [draftSearch, setDraftSearch] = useState(selectedCompany?.name ?? "");
  const [submittedSearch, setSubmittedSearch] = useState(selectedCompany?.name ?? "");

  useEffect(() => {
    setDraftSearch(selectedCompany?.name ?? "");
    setSubmittedSearch(selectedCompany?.name ?? "");
  }, [selectedCompany?.id, selectedCompany?.name]);

  const companiesQuery = useQuery({
    queryKey: companyPickerQueryKey(submittedSearch),
    queryFn: () =>
      fetchCompanies({
        limit: COMPANY_PICKER_LIMIT,
        q: submittedSearch.trim() || undefined,
      }),
  });

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(draftSearch.trim());
  }

  function handleReset() {
    setDraftSearch("");
    setSubmittedSearch("");
    onSelect(null);
  }

  const companies = companiesQuery.data?.companies ?? [];

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
          <Building2 className="h-4 w-4 text-emerald-700" />
          Company vazba
        </div>
        <div className="text-sm text-slate-600">
          {selectedCompany ? `${selectedCompany.name} (#${selectedCompany.id})` : "Bez firmy"}
        </div>
      </div>

      <form className="grid gap-2 md:grid-cols-[1fr_auto_auto]" onSubmit={handleSearch}>
        <Input
          value={draftSearch}
          onChange={(event) => setDraftSearch(event.target.value)}
          placeholder="Hledat firmu podle názvu, IČO nebo slugu"
        />
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" />
          Hledat
        </Button>
        <Button type="button" variant="ghost" onClick={handleReset}>
          <X className="h-4 w-4" />
          Reset
        </Button>
      </form>

      {companiesQuery.isLoading ? (
        <p className="text-sm text-slate-500">Načítám firmy...</p>
      ) : companiesQuery.isError ? (
        <p className="text-sm text-rose-700">{getErrorMessage(companiesQuery.error)}</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => {
            const isSelected = selectedCompany?.id === company.id;
            return (
              <button
                key={company.id}
                type="button"
                className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                  isSelected ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"
                }`}
                onClick={() => onSelect(toSelection(company))}
              >
                <span className="block font-medium">{company.name}</span>
                <span className="mt-1 block text-xs text-slate-500">ID {company.id}</span>
              </button>
            );
          })}
          {companies.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">Žádná firma nenalezena.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
