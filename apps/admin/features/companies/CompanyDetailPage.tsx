"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { BriefcaseBusiness, Search, SquareArrowOutUpRight, UserPlus, Users } from "lucide-react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@ui/components/core/badge";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { Input } from "@ui/components/core/input";
import { useToast } from "@ui/hooks/use-toast";
import { DataTable } from "@/components/data-table/DataTable";
import { MetricCard } from "@/components/admin-shell/MetricCard";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getErrorMessage } from "@/lib/errors";
import { formatCompactNumber, formatDateTime, formatJobTerm, formatName } from "@/lib/formatting";
import { CompanyForm } from "./CompanyForm";
import {
  assignCompanyUser,
  fetchCompanyCandidateSearches,
  fetchCompanyDetail,
  fetchCompanyJobs,
  fetchCompanyOfferTypes,
  fetchCompanyUsers,
  unassignCompanyUser,
  updateCompany,
} from "./api";
import {
  companyToFormValues,
  createEmptyCompanyFormValues,
  formValuesToCompanyPayload,
  getSafeExternalUrl,
  type CompanyFormValues,
} from "./companyFormData";
import {
  companiesQueryKey,
  companyCandidateSearchesQueryKey,
  companyDetailQueryKey,
  companyJobsQueryKey,
  companyOfferTypesQueryKey,
  companyUsersQueryKey,
} from "./queries";

const COMPANY_USERS_PAGE_SIZE = 50;
const CANDIDATE_SEARCHES_PAGE_SIZE = 25;

type CandidateSearchPageParam = {
  beforeCreatedAt?: string;
  beforeId?: number;
};

function formatList(values: Array<string | number | null | undefined>, empty = "—"): string {
  const filtered = values
    .map((value) => (value == null ? "" : String(value).trim()))
    .filter(Boolean);

  return filtered.length ? filtered.join(", ") : empty;
}

function isPositiveIntegerId(value: string): boolean {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0;
}

export function CompanyDetailPage({ companyId }: { companyId: string }) {
  const [assignUserId, setAssignUserId] = useState("");
  const [assignHubspotLink, setAssignHubspotLink] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const hasValidCompanyId = isPositiveIntegerId(companyId);

  const companyDetailQuery = useQuery({
    queryKey: companyDetailQueryKey(companyId),
    queryFn: () => fetchCompanyDetail(companyId),
    enabled: hasValidCompanyId,
  });
  const companyJobsQuery = useQuery({
    queryKey: companyJobsQueryKey(companyId),
    queryFn: () => fetchCompanyJobs(companyId),
    enabled: hasValidCompanyId,
  });
  const companyUsersQuery = useInfiniteQuery({
    queryKey: companyUsersQueryKey(companyId),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      fetchCompanyUsers(companyId, {
        limit: COMPANY_USERS_PAGE_SIZE,
        afterId: typeof pageParam === "number" ? pageParam : undefined,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pageInfo.hasNext) {
        return undefined;
      }

      return lastPage.users.at(-1)?.id;
    },
    enabled: hasValidCompanyId,
  });
  const candidateSearchesQuery = useInfiniteQuery({
    queryKey: companyCandidateSearchesQueryKey(companyId),
    initialPageParam: undefined as CandidateSearchPageParam | undefined,
    queryFn: ({ pageParam }) =>
      fetchCompanyCandidateSearches(companyId, {
        limit: CANDIDATE_SEARCHES_PAGE_SIZE,
        beforeCreatedAt: pageParam?.beforeCreatedAt,
        beforeId: pageParam?.beforeId,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pageInfo.hasNext) {
        return undefined;
      }

      const lastItem = lastPage.candidateSearches.at(-1);
      return lastItem
        ? {
            beforeCreatedAt: lastItem.createdAt,
            beforeId: lastItem.id,
          }
        : undefined;
    },
    enabled: hasValidCompanyId,
  });
  const offerTypesQuery = useQuery({
    queryKey: companyOfferTypesQueryKey,
    queryFn: fetchCompanyOfferTypes,
  });

  const updateMutation = useMutation({
    mutationFn: (values: CompanyFormValues) => updateCompany(companyId, formValuesToCompanyPayload(values)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: companyDetailQueryKey(companyId) }),
        queryClient.invalidateQueries({ queryKey: companiesQueryKey }),
      ]);
      toast({
        title: "Firma uložena",
        description: "Detail firmy se znovu načetl z admin endpointu.",
      });
    },
    onError: (error) => {
      toast({
        title: "Uložení firmy selhalo",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
  const assignUserMutation = useMutation({
    mutationFn: (input: { userId: number; hubspotLink: string | null }) =>
      assignCompanyUser(companyId, input.userId, {
        hubspot_link: input.hubspotLink,
      }),
    onSuccess: async () => {
      setAssignUserId("");
      setAssignHubspotLink("");
      await queryClient.invalidateQueries({ queryKey: companyUsersQueryKey(companyId) });
      toast({
        title: "User přiřazen",
        description: "Seznam navázaných userů se znovu načetl.",
      });
    },
    onError: (error) => {
      toast({
        title: "Přiřazení usera selhalo",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
  const unassignUserMutation = useMutation({
    mutationFn: (userId: number) => unassignCompanyUser(companyId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyUsersQueryKey(companyId) });
      toast({
        title: "User odpojen",
        description: "Seznam navázaných userů se znovu načetl.",
      });
    },
    onError: (error) => {
      toast({
        title: "Odpojení usera selhalo",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const company = companyDetailQuery.data?.data;
  const companyHubspotUrl = getSafeExternalUrl(company?.hubspotLink);
  const companyWebUrl = getSafeExternalUrl(company?.web);
  const editInitialValues = useMemo(() => (company ? companyToFormValues(company) : createEmptyCompanyFormValues()), [company]);
  const jobs = companyJobsQuery.data?.jobs ?? [];
  const statsMap = new Map((companyJobsQuery.data?.stats ?? []).map((stat) => [stat.jobId, stat]));
  const users = companyUsersQuery.data?.pages.flatMap((page) => page.users) ?? [];
  const candidateSearches = candidateSearchesQuery.data?.pages.flatMap((page) => page.candidateSearches) ?? [];

  function handleAssignUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userId = Number(assignUserId);

    if (!Number.isInteger(userId) || userId < 1) {
      toast({
        title: "Neplatné user ID",
        description: "Zadej kladné celé číslo usera.",
        variant: "destructive",
      });
      return;
    }

    const trimmedHubspotLink = assignHubspotLink.trim();
    const safeHubspotLink = getSafeExternalUrl(trimmedHubspotLink);

    if (trimmedHubspotLink && !safeHubspotLink) {
      toast({
        title: "Neplatný HubSpot link",
        description: "Použij pouze http nebo https URL.",
        variant: "destructive",
      });
      return;
    }

    assignUserMutation.mutate({
      userId,
      hubspotLink: safeHubspotLink,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Companies"
        title={company?.name ?? `Company #${companyId}`}
        description="Admin detail firmy: editace, HubSpot, joby, user assignment a company-scoped candidate searches."
        actions={
          <div className="flex flex-wrap gap-3">
            {companyHubspotUrl ? (
              <Button asChild>
                <a href={companyHubspotUrl} target="_blank" rel="noreferrer">
                  <SquareArrowOutUpRight className="h-4 w-4" />
                  HubSpot
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/companies">Zpět na firmy</Link>
            </Button>
          </div>
        }
      />

      {!hasValidCompanyId ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">Neplatné company ID.</CardContent>
        </Card>
      ) : companyDetailQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám detail firmy...</CardContent>
        </Card>
      ) : companyDetailQuery.isError || !company ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(companyDetailQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Joby" value={formatCompactNumber(jobs.length)} hint="Veřejný company jobs endpoint." icon={BriefcaseBusiness} />
            <MetricCard title="Users" value={formatCompactNumber(users.length)} hint={`Limit ${COMPANY_USERS_PAGE_SIZE} na request.`} icon={Users} />
            <MetricCard
              title="Candidate Searches"
              value={formatCompactNumber(candidateSearches.length)}
              hint={`Limit ${CANDIDATE_SEARCHES_PAGE_SIZE} na stránku.`}
              icon={Search}
            />
            <MetricCard
              title="Updated"
              value={formatDateTime(company.updatedAt)}
              hint={`Created: ${formatDateTime(company.createdAt)}`}
              icon={SquareArrowOutUpRight}
            />
          </div>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="grid gap-4 p-6 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Název</p>
                <p className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">{company.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Web / slug</p>
                <p className="mt-2 text-slate-700">{company.slug ?? "Bez slugu"}</p>
                {companyWebUrl ? (
                  <a className="text-sm text-emerald-700 underline-offset-4 hover:underline" href={companyWebUrl} target="_blank" rel="noreferrer">
                    {company.web}
                  </a>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">IČO / paid until</p>
                <p className="mt-2 text-slate-700">IČO: {company.ico ?? "—"}</p>
                <p className="text-sm text-slate-600">Paid until: {company.paidUntil ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Edit Company</p>
                <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                  Úprava firmy
                </h2>
              </div>
              {offerTypesQuery.isError ? (
                <p className="text-sm text-rose-700">{getErrorMessage(offerTypesQuery.error)}</p>
              ) : null}
              <CompanyForm
                initialValues={editInitialValues}
                isSubmitting={updateMutation.isPending}
                offerTypes={offerTypesQuery.data?.offerTypes ?? []}
                onSubmit={(values) => updateMutation.mutate(values)}
                submitLabel="Uložit firmu"
              />
            </CardContent>
          </Card>

          <DataTable
            data={jobs}
            keyExtractor={(job) => String(job.id)}
            emptyMessage="K firmě nejsou navázané žádné veřejné joby."
            columns={[
              {
                header: "Job",
                className: "min-w-[260px]",
                render: (job) => (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{job.description}</p>
                    <Badge className="bg-emerald-100 text-emerald-900">{formatJobTerm(job.term)}</Badge>
                  </div>
                ),
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

          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Company Users</p>
                <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                  Přiřazení usera
                </h2>
              </div>
              <form className="grid gap-3 md:grid-cols-[180px_1fr_auto]" onSubmit={handleAssignUser}>
                <Input value={assignUserId} onChange={(event) => setAssignUserId(event.target.value)} placeholder="User ID" type="number" min={1} />
                <Input
                  value={assignHubspotLink}
                  onChange={(event) => setAssignHubspotLink(event.target.value)}
                  placeholder="Volitelný HubSpot link usera"
                  type="url"
                />
                <Button type="submit" disabled={assignUserMutation.isPending}>
                  <UserPlus className="h-4 w-4" />
                  {assignUserMutation.isPending ? "Přiřazuji..." : "Přiřadit"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {companyUsersQuery.isLoading ? (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">Načítám usery firmy...</CardContent>
            </Card>
          ) : companyUsersQuery.isError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(companyUsersQuery.error)}</CardContent>
            </Card>
          ) : (
            <>
              <DataTable
                data={users}
                keyExtractor={(user) => String(user.id)}
                emptyMessage="K firmě nejsou přiřazení žádní users."
                columns={[
                  {
                    header: "User",
                    render: (user) => (
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{formatName([user.givenName, user.familyName])}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ID {user.id}</p>
                      </div>
                    ),
                  },
                  {
                    header: "Kontakt",
                    render: (user) => (
                      <div className="space-y-1">
                        <p>{user.email ?? "Bez e-mailu"}</p>
                        <p className="text-slate-600">{user.phone ?? "Bez telefonu"}</p>
                      </div>
                    ),
                  },
                  {
                    header: "HubSpot",
                    render: (user) => {
                      const userHubspotUrl = getSafeExternalUrl(user.hubspotLink);
                      return userHubspotUrl ? (
                        <a className="text-emerald-700 underline-offset-4 hover:underline" href={userHubspotUrl} target="_blank" rel="noreferrer">
                          Otevřít
                        </a>
                      ) : (
                        "—"
                      );
                    },
                  },
                  {
                    header: "Odpojit",
                    render: (user) => (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={unassignUserMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Odpojit usera #${user.id} od firmy?`)) {
                            unassignUserMutation.mutate(user.id);
                          }
                        }}
                      >
                        Odpojit
                      </Button>
                    ),
                  },
                ]}
              />
              {companyUsersQuery.hasNextPage ? (
                <Card className="border-white/80 bg-white/90">
                  <CardContent className="p-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={companyUsersQuery.isFetchingNextPage}
                      onClick={() => companyUsersQuery.fetchNextPage()}
                    >
                      {companyUsersQuery.isFetchingNextPage ? "Načítám..." : "Načíst další usery"}
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}

          {candidateSearchesQuery.isLoading ? (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">Načítám candidate searches firmy...</CardContent>
            </Card>
          ) : candidateSearchesQuery.isError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(candidateSearchesQuery.error)}</CardContent>
            </Card>
          ) : (
            <>
              <DataTable
                data={candidateSearches}
                keyExtractor={(item) => String(item.id)}
                emptyMessage="Firma zatím nemá žádné candidate search dotazy."
                columns={[
                  {
                    header: "Search",
                    className: "min-w-[260px]",
                    render: (item) => (
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{item.keyword ?? item.searchTerm ?? "Bez keyword"}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ID {item.id}</p>
                        <p className="text-sm text-slate-600">{formatDateTime(item.createdAt)}</p>
                      </div>
                    ),
                  },
                  {
                    header: "User",
                    render: (item) => (
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{formatName([item.user.givenName, item.user.familyName])}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ID {item.user.id}</p>
                        <p className="text-sm text-slate-600">{item.user.email ?? "Bez e-mailu"}</p>
                      </div>
                    ),
                  },
                  {
                    header: "Filtry",
                    className: "min-w-[320px]",
                    render: (item) => (
                      <div className="space-y-1">
                        <p>Skills: {formatList(item.skills)}</p>
                        <p>Terms: {formatList(item.jobTerms.map(formatJobTerm))}</p>
                        <p>Schools: {formatList(item.schoolIds)}</p>
                        <p>Faculties: {formatList(item.schoolFacultyIds)}</p>
                      </div>
                    ),
                  },
                  {
                    header: "Flags",
                    render: (item) => (
                      <div className="space-y-1">
                        <Badge className={item.showAll ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-700"}>
                          {item.showAll ? "Show all" : "Filtered"}
                        </Badge>
                        <p className="text-sm text-slate-600">Age: {item.ageFilter ?? "—"}</p>
                      </div>
                    ),
                  },
                ]}
              />
              {candidateSearchesQuery.hasNextPage ? (
                <Card className="border-white/80 bg-white/90">
                  <CardContent className="p-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={candidateSearchesQuery.isFetchingNextPage}
                      onClick={() => candidateSearchesQuery.fetchNextPage()}
                    >
                      {candidateSearchesQuery.isFetchingNextPage ? "Načítám..." : "Načíst další candidate searches"}
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
