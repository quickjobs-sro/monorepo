"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import {
  Building2,
  Filter,
  Plus,
  Search,
  SquareArrowOutUpRight,
  X,
} from "lucide-react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Badge } from "@ui/components/core/badge";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { Checkbox } from "@ui/components/core/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/components/core/dialog";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import { useToast } from "@ui/hooks/use-toast";
import { DataTable } from "@/components/data-table/DataTable";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getErrorMessage } from "@/lib/errors";
import { formatCompactNumber, formatDateTime } from "@/lib/formatting";
import { CompanyForm } from "./CompanyForm";
import {
  createCompany,
  fetchCompanies,
  fetchCompanyOfferTypes,
  fetchCompanySortOrderStats,
} from "./api";
import {
  buildCompaniesListFilterState,
  buildCompaniesQueryParams,
  EMPTY_MISSING_COMPANY_FILTERS,
  getActiveMissingCompanyFilterLabels,
  MISSING_COMPANY_FILTER_OPTIONS,
  type MissingCompanyFilterKey,
  type MissingCompanyFilters,
} from "./companyFilters";
import {
  createEmptyCompanyFormValues,
  formValuesToCompanyPayload,
  getSafeExternalUrl,
  type CompanyFormValues,
} from "./companyFormData";
import {
  companiesListQueryKey,
  companiesQueryKey,
  companyOfferTypesQueryKey,
  companySortOrderStatsQueryKey,
} from "./queries";

const COMPANY_PAGE_SIZE = 50;

export function CompaniesPage() {
  const [draftSearch, setDraftSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [draftMissingFilters, setDraftMissingFilters] =
    useState<MissingCompanyFilters>(EMPTY_MISSING_COMPANY_FILTERS);
  const [submittedMissingFilters, setSubmittedMissingFilters] =
    useState<MissingCompanyFilters>(EMPTY_MISSING_COMPANY_FILTERS);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMissingFilters, setShowMissingFilters] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const listFilters = useMemo(
    () =>
      buildCompaniesListFilterState(submittedSearch, submittedMissingFilters),
    [submittedSearch, submittedMissingFilters],
  );
  const activeMissingFilterLabels = getActiveMissingCompanyFilterLabels(
    submittedMissingFilters,
  );

  const companiesQuery = useInfiniteQuery({
    queryKey: companiesListQueryKey(listFilters),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      fetchCompanies(
        buildCompaniesQueryParams({
          limit: COMPANY_PAGE_SIZE,
          afterId: typeof pageParam === "number" ? pageParam : undefined,
          filters: listFilters,
        }),
      ),
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
  const sortOrderStatsQuery = useQuery({
    queryKey: companySortOrderStatsQueryKey,
    queryFn: fetchCompanySortOrderStats,
    enabled: showCreateForm,
  });

  const createMutation = useMutation({
    mutationFn: (values: CompanyFormValues) =>
      createCompany(formValuesToCompanyPayload(values)),
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

  const createInitialValues = useMemo(
    () => createEmptyCompanyFormValues(),
    [showCreateForm],
  );
  const companies =
    companiesQuery.data?.pages.flatMap((page) => page.companies) ?? [];

  const searchLabel = listFilters.q
    ? `Search: "${listFilters.q}"`
    : "Search: bez filtru";
  const missingFilterLabel = activeMissingFilterLabels.length
    ? `Data quality: ${activeMissingFilterLabels.join(" / ")}`
    : "Data quality: bez filtru";

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(draftSearch.trim());
  }

  function handleResetSearch() {
    setDraftSearch("");
    setSubmittedSearch("");
    setDraftMissingFilters(EMPTY_MISSING_COMPANY_FILTERS);
    setSubmittedMissingFilters(EMPTY_MISSING_COMPANY_FILTERS);
  }

  function handleOpenMissingFilters() {
    setDraftMissingFilters(submittedMissingFilters);
    setShowMissingFilters(true);
  }

  function setDraftMissingFilter(
    key: MissingCompanyFilterKey,
    checked: boolean,
  ) {
    setDraftMissingFilters((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  function handleApplyMissingFilters() {
    setSubmittedMissingFilters(draftMissingFilters);
    setShowMissingFilters(false);
  }

  function handleClearMissingFilters() {
    setDraftMissingFilters(EMPTY_MISSING_COMPANY_FILTERS);
    setSubmittedMissingFilters(EMPTY_MISSING_COMPANY_FILTERS);
    setShowMissingFilters(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reference Data"
        title="Companies"
        description="Admin katalog firem přes `/admin/companies` s create/edit workflow bez per-row requestů."
        actions={
          <>
            <form
              className="flex w-full flex-wrap gap-2 sm:w-auto"
              onSubmit={handleSearch}
            >
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
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenMissingFilters}
            >
              <Filter className="h-4 w-4" />
              Data quality
              {activeMissingFilterLabels.length ? (
                <Badge className="ml-1 bg-emerald-100 text-emerald-900">
                  {activeMissingFilterLabels.length}
                </Badge>
              ) : null}
            </Button>
            <Button onClick={() => setShowCreateForm((current) => !current)}>
              <Plus className="h-4 w-4" />
              Nová firma
            </Button>
          </>
        }
      />

      <Dialog open={showMissingFilters} onOpenChange={setShowMissingFilters}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Data quality filtry</DialogTitle>
            <DialogDescription>
              Filtry běží server-side nad `/admin/companies`. Více zaškrtnutých
              položek má OR semantiku.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {MISSING_COMPANY_FILTER_OPTIONS.map((filter) => (
              <div
                key={filter.query}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <Label htmlFor={`company-filter-${filter.key}`}>
                  <span className="block font-medium text-slate-900">
                    {filter.label}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {filter.query}
                  </span>
                </Label>
                <Checkbox
                  id={`company-filter-${filter.key}`}
                  checked={draftMissingFilters[filter.key]}
                  onCheckedChange={(checked) =>
                    setDraftMissingFilter(filter.key, checked === true)
                  }
                />
              </div>
            ))}
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Vybrané filtry rozšiřují výsledek: firma se vrátí, pokud jí chybí
              aspoň jedna zaškrtnutá hodnota.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowMissingFilters(false)}
            >
              Zavřít
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClearMissingFilters}
            >
              Vyčistit filtry
            </Button>
            <Button type="button" onClick={handleApplyMissingFilters}>
              Použít filtry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showCreateForm ? (
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Create Company
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                Nová firma
              </h2>
            </div>
            {offerTypesQuery.isError ? (
              <p className="text-sm text-rose-700">
                {getErrorMessage(offerTypesQuery.error)}
              </p>
            ) : null}
            <CompanyForm
              autoFillSortOrder
              initialValues={createInitialValues}
              isSubmitting={createMutation.isPending}
              offerTypes={offerTypesQuery.data?.offerTypes ?? []}
              onCancel={() => setShowCreateForm(false)}
              onSubmit={(values) => createMutation.mutate(values)}
              sortOrderStats={sortOrderStatsQuery.data}
              submitLabel="Vytvořit firmu"
            />
          </CardContent>
        </Card>
      ) : null}

      {companiesQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">
            Načítám firmy...
          </CardContent>
        </Card>
      ) : companiesQuery.isError ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">
            {getErrorMessage(companiesQuery.error)}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-white/80 bg-white/90">
            <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-slate-600">
              <Building2 className="h-4 w-4 text-emerald-700" />
              <span>Načteno: {companies.length}</span>
              <span>{searchLabel}</span>
              <span>{missingFilterLabel}</span>
              <span>Page size: {COMPANY_PAGE_SIZE}</span>
              {companiesQuery.hasNextPage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={companiesQuery.isFetchingNextPage}
                  onClick={() => companiesQuery.fetchNextPage()}
                >
                  {companiesQuery.isFetchingNextPage
                    ? "Načítám..."
                    : "Načíst další"}
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
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      ID {company.id}
                    </p>
                    <p className="text-sm text-slate-600">
                      IČO: {company.ico ?? "—"}
                    </p>
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
                        <a
                          className="text-emerald-700 underline-offset-4 hover:underline"
                          href={webUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {company.web}
                        </a>
                      ) : (
                        <p className="text-slate-500">
                          {company.web ? "Neplatné URL" : "Bez webu"}
                        </p>
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
                header: "Data quality",
                render: (company) => {
                  const rawLogo = company.logo?.trim();
                  const logoUrl = getSafeExternalUrl(rawLogo);
                  const logoFallback = rawLogo
                    ? "Logo: neplatné URL"
                    : "Logo: chybí";
                  return (
                    <div className="space-y-2">
                      {logoUrl ? (
                        <div className="flex items-center gap-2">
                          <Image
                            alt={`${company.name} logo`}
                            className="h-9 w-9 rounded border border-slate-200 bg-white object-contain p-1"
                            height={36}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.classList.add("hidden");
                              event.currentTarget.nextElementSibling?.classList.remove(
                                "hidden",
                              );
                            }}
                            src={logoUrl}
                            unoptimized
                            width={36}
                          />
                          <Badge className="hidden bg-amber-100 text-amber-900">
                            Logo: nelze načíst
                          </Badge>
                        </div>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-900">
                          {logoFallback}
                        </Badge>
                      )}
                      <p className="text-sm text-slate-600">
                        Kontakty: {formatCompactNumber(company.contactCount)}
                      </p>
                    </div>
                  );
                },
              },
              {
                header: "Aktualizováno",
                render: (company) => (
                  <span>{formatDateTime(company.updatedAt)}</span>
                ),
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
