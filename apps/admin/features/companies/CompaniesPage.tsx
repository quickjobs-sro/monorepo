"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Building2, Plus, Search, SquareArrowOutUpRight, X } from "lucide-react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { Input } from "@ui/components/core/input";
import { useToast } from "@ui/hooks/use-toast";
import { DataTable } from "@/components/data-table/DataTable";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/formatting";
import { CompanyForm } from "./CompanyForm";
import { createCompany, fetchCompanies, fetchCompanyOfferTypes } from "./api";
import {
  createEmptyCompanyFormValues,
  formValuesToCompanyPayload,
  getSafeExternalUrl,
  type CompanyFormValues,
} from "./companyFormData";
import { companiesListQueryKey, companiesQueryKey, companyOfferTypesQueryKey } from "./queries";

const COMPANY_PAGE_SIZE = 50;

export function CompaniesPage() {
  const [draftSearch, setDraftSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const companiesQuery = useInfiniteQuery({
    queryKey: companiesListQueryKey(submittedSearch),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      fetchCompanies({
        limit: COMPANY_PAGE_SIZE,
        afterId: typeof pageParam === "number" ? pageParam : undefined,
        q: submittedSearch.trim() || undefined,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pageInfo.hasNext) {
        return undefined;
      }

      return lastPage.companies.at(-1)?.id;
    },
  });
  const offerTypesQuery = useQuery({
    queryKey: companyOfferTypesQueryKey,
    queryFn: fetchCompanyOfferTypes,
  });

  const createMutation = useMutation({
    mutationFn: (values: CompanyFormValues) => createCompany(formValuesToCompanyPayload(values)),
    onSuccess: async () => {
      setShowCreateForm(false);
      await queryClient.invalidateQueries({ queryKey: companiesQueryKey });
      toast({
        title: "Firma vytvořena",
        description: "Seznam firem se znovu načetl z admin endpointu.",
      });
    },
    onError: (error) => {
      toast({
        title: "Vytvoření firmy selhalo",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const createInitialValues = useMemo(() => createEmptyCompanyFormValues(), [showCreateForm]);
  const companies = companiesQuery.data?.pages.flatMap((page) => page.companies) ?? [];

  const searchLabel = submittedSearch.trim() ? `Search: "${submittedSearch.trim()}"` : "Search: bez filtru";

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(draftSearch.trim());
  }

  function handleResetSearch() {
    setDraftSearch("");
    setSubmittedSearch("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reference Data"
        title="Companies"
        description="Admin katalog firem přes `/admin/companies` s create/edit workflow bez per-row requestů."
        actions={
          <>
            <form className="flex w-full flex-wrap gap-2 sm:w-auto" onSubmit={handleSearch}>
              <Input
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Hledat firmu, IČO, slug nebo web"
                wrapperProps={{ className: "w-full max-w-xs" }}
              />
              <Button type="submit" variant="outline">
                <Search className="h-4 w-4" />
                Hledat
              </Button>
              <Button type="button" variant="ghost" onClick={handleResetSearch}>
                <X className="h-4 w-4" />
                Reset
              </Button>
            </form>
            <Button onClick={() => setShowCreateForm((current) => !current)}>
              <Plus className="h-4 w-4" />
              Nová firma
            </Button>
          </>
        }
      />

      {showCreateForm ? (
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Create Company</p>
              <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                Nová firma
              </h2>
            </div>
            {offerTypesQuery.isError ? (
              <p className="text-sm text-rose-700">{getErrorMessage(offerTypesQuery.error)}</p>
            ) : null}
            <CompanyForm
              initialValues={createInitialValues}
              isSubmitting={createMutation.isPending}
              offerTypes={offerTypesQuery.data?.offerTypes ?? []}
              onCancel={() => setShowCreateForm(false)}
              onSubmit={(values) => createMutation.mutate(values)}
              submitLabel="Vytvořit firmu"
            />
          </CardContent>
        </Card>
      ) : null}

      {companiesQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám firmy...</CardContent>
        </Card>
      ) : companiesQuery.isError ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(companiesQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-white/80 bg-white/90">
            <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-slate-600">
              <Building2 className="h-4 w-4 text-emerald-700" />
              <span>Načteno: {companies.length}</span>
              <span>{searchLabel}</span>
              <span>Page size: {COMPANY_PAGE_SIZE}</span>
              {companiesQuery.hasNextPage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={companiesQuery.isFetchingNextPage}
                  onClick={() => companiesQuery.fetchNextPage()}
                >
                  {companiesQuery.isFetchingNextPage ? "Načítám..." : "Načíst další"}
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <DataTable
            data={companies}
            keyExtractor={(company) => String(company.id)}
            emptyMessage="Žádná firma neodpovídá aktuálnímu filtru."
            columns={[
              {
                header: "Firma",
                className: "min-w-[240px]",
                render: (company) => (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{company.name}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ID {company.id}</p>
                    <p className="text-sm text-slate-600">IČO: {company.ico ?? "—"}</p>
                  </div>
                ),
              },
              {
                header: "Web / slug",
                render: (company) => {
                  const webUrl = getSafeExternalUrl(company.web);
                  return (
                    <div className="space-y-1">
                      <p>{company.slug ?? "Bez slugu"}</p>
                      {webUrl ? (
                        <a className="text-emerald-700 underline-offset-4 hover:underline" href={webUrl} target="_blank" rel="noreferrer">
                          {company.web}
                        </a>
                      ) : (
                        <p className="text-slate-500">{company.web ? "Neplatné URL" : "Bez webu"}</p>
                      )}
                    </div>
                  );
                },
              },
              {
                header: "HubSpot",
                render: (company) => {
                  const hubspotUrl = getSafeExternalUrl(company.hubspotLink);
                  return hubspotUrl ? (
                    <a
                      className="inline-flex items-center gap-1 text-emerald-700 underline-offset-4 hover:underline"
                      href={hubspotUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Otevřít
                      <SquareArrowOutUpRight className="h-4 w-4" />
                    </a>
                  ) : (
                    "—"
                  );
                },
              },
              {
                header: "Aktualizováno",
                render: (company) => <span>{formatDateTime(company.updatedAt)}</span>,
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
        </>
      )}
    </div>
  );
}
