"use client";

/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Building2, ChevronsUpDown, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/core/button";
import { Input } from "@ui/components/core/input";
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/core/popover";
import { getErrorMessage } from "@/lib/errors";
import type { AdminCompanyListItem } from "@/lib/openapi/types";
import { fetchCompanies } from "./api";
import { companyPickerQueryKey } from "./queries";
import type { CompanyPickerSelection } from "./CompanyPicker";

const COMPANY_SEARCH_LIMIT = 20;
const COMPANY_SEARCH_DEBOUNCE_MS = 300;

type CompanySearchSelectProps = {
  selectedCompany: CompanyPickerSelection | null;
  onSelect(company: CompanyPickerSelection | null): void;
  placeholder?: string;
};

function toSelection(company: AdminCompanyListItem): CompanyPickerSelection {
  return {
    id: company.id,
    name: company.name,
  };
}

export function CompanySearchSelect({
  selectedCompany,
  onSelect,
  placeholder = "Vybrat firmu",
}: CompanySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(selectedCompany?.name ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    setSearch(selectedCompany?.name ?? "");
    setDebouncedSearch(selectedCompany?.name ?? "");
  }, [selectedCompany?.id, selectedCompany?.name]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), COMPANY_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const normalizedSearch = debouncedSearch.trim();
  const companiesQuery = useQuery({
    queryKey: companyPickerQueryKey(normalizedSearch),
    queryFn: () =>
      fetchCompanies({
        limit: COMPANY_SEARCH_LIMIT,
        q: normalizedSearch || undefined,
      }),
    enabled: open,
  });

  const companies = companiesQuery.data?.companies ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between bg-white text-left font-normal">
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-emerald-700" />
            <span className="truncate">{selectedCompany ? selectedCompany.name : placeholder}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(420px,calc(100vw-2rem))] p-3">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hledat firmu podle názvu, IČO nebo slugu"
              className="pl-9"
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
          >
            <X className="h-4 w-4" />
            Bez company filtru
          </Button>

          {companiesQuery.isLoading ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">Načítám firmy...</p>
          ) : companiesQuery.isError ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {getErrorMessage(companiesQuery.error)}
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {companies.map((company) => {
                const isSelected = selectedCompany?.id === company.id;
                return (
                  <button
                    key={company.id}
                    type="button"
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"
                    }`}
                    onClick={() => {
                      onSelect(toSelection(company));
                      setOpen(false);
                    }}
                  >
                    <span className="block font-medium">{company.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">ID {company.id}</span>
                  </button>
                );
              })}
              {companies.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
                  Žádná firma nenalezena.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
