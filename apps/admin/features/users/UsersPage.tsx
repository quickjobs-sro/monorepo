"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Plus, Search, UserRound, X } from "lucide-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@ui/components/core/badge";
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
import { useToast } from "@ui/hooks/use-toast";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatName } from "@/lib/formatting";
import { CompanySearchSelect } from "../companies/CompanySearchSelect";
import type { CompanyPickerSelection } from "../companies/CompanyPicker";
import { getSafeExternalUrl } from "../companies/companyFormData";
import { companyUsersRootQueryKey } from "../companies/queries";
import { createUser, fetchUsers, type UsersQueryParams } from "./api";
import { UserForm } from "./UserForm";
import {
  createEmptyUserFormValues,
  formValuesToUserPayload,
  type UserFormValues,
} from "./userFormData";
import { usersListQueryKey, usersQueryKey } from "./queries";

const USERS_PAGE_SIZE = 50;

type BooleanFilter = "all" | "true" | "false";
type RoleFilter = "all" | "candidate" | "employer" | "root";

type UsersFilterState = {
  q: string;
  companyId?: number;
  role: RoleFilter;
  enabled: BooleanFilter;
  deleted: BooleanFilter;
};

function booleanFilterValue(value: BooleanFilter): boolean | undefined {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function toQueryParams(filters: UsersFilterState): UsersQueryParams {
  return {
    limit: USERS_PAGE_SIZE,
    q: filters.q.trim() || undefined,
    companyId: filters.companyId,
    role: filters.role === "all" ? undefined : filters.role,
    enabled: booleanFilterValue(filters.enabled),
    deleted: booleanFilterValue(filters.deleted),
  };
}

function roleBadges(roles: string[]) {
  return roles.length ? roles : ["bez role"];
}

export function UsersPage() {
  const [draftFilters, setDraftFilters] = useState<UsersFilterState>({
    q: "",
    role: "all",
    enabled: "all",
    deleted: "false",
  });
  const [submittedFilters, setSubmittedFilters] = useState<UsersFilterState>(draftFilters);
  const [draftCompany, setDraftCompany] = useState<CompanyPickerSelection | null>(null);
  const [submittedCompany, setSubmittedCompany] = useState<CompanyPickerSelection | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const usersQueryParams = useMemo(() => toQueryParams(submittedFilters), [submittedFilters]);

  const usersQuery = useInfiniteQuery({
    queryKey: usersListQueryKey(usersQueryParams),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      fetchUsers({
        ...usersQueryParams,
        afterId: typeof pageParam === "number" ? pageParam : undefined,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pageInfo.hasNext) {
        return undefined;
      }

      return lastPage.users.at(-1)?.id;
    },
  });

  const createInitialValues = useMemo(() => {
    const values = createEmptyUserFormValues();
    values.companyId = submittedCompany ? String(submittedCompany.id) : "";
    return values;
  }, [submittedCompany, showCreateForm]);

  const createMutation = useMutation({
    mutationFn: (values: UserFormValues) => createUser(formValuesToUserPayload(values)),
    onSuccess: async () => {
      setShowCreateForm(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: usersQueryKey }),
        queryClient.invalidateQueries({ queryKey: companyUsersRootQueryKey }),
      ]);
      toast({
        title: "User vytvořen",
        description: "Seznam userů se znovu načetl z admin endpointu.",
      });
    },
    onError: (error) => {
      toast({
        title: "Vytvoření usera selhalo",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const users = usersQuery.data?.pages.flatMap((page) => page.users) ?? [];
  const activeFilterLabel = submittedFilters.q.trim() ? `Search: "${submittedFilters.q.trim()}"` : "Search: bez filtru";

  function setDraftFilter<Key extends keyof UsersFilterState>(key: Key, value: UsersFilterState[Key]) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleCompanySelect(company: CompanyPickerSelection | null) {
    setDraftCompany(company);
    setDraftFilter("companyId", company?.id);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedFilters(draftFilters);
    setSubmittedCompany(draftCompany);
  }

  function handleReset() {
    const resetFilters: UsersFilterState = {
      q: "",
      role: "all",
      enabled: "all",
      deleted: "false",
    };
    setDraftFilters(resetFilters);
    setSubmittedFilters(resetFilters);
    setDraftCompany(null);
    setSubmittedCompany(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Users"
        description="Admin list userů přes `/admin/users` s cursor stránkováním, company filtrem a create/edit workflow."
        actions={
          <Button onClick={() => setShowCreateForm((current) => !current)}>
            <Plus className="h-4 w-4" />
            Nový user
          </Button>
        }
      />

      <Card className="border-white/80 bg-white/90">
        <CardContent className="space-y-4 p-6">
          <form className="grid gap-3 xl:grid-cols-[1fr_220px_170px_150px_150px_auto_auto]" onSubmit={handleSearch}>
            <Input
              value={draftFilters.q}
              onChange={(event) => setDraftFilter("q", event.target.value)}
              placeholder="Hledat jméno, e-mail nebo telefon"
            />
            <CompanySearchSelect
              selectedCompany={draftCompany}
              onSelect={handleCompanySelect}
              placeholder="Firma: všechny"
            />
            <Select value={draftFilters.role} onValueChange={(value) => setDraftFilter("role", value as RoleFilter)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny role</SelectItem>
                <SelectItem value="candidate">Candidate</SelectItem>
                <SelectItem value="employer">Employer</SelectItem>
                <SelectItem value="root">Root</SelectItem>
              </SelectContent>
            </Select>
            <Select value={draftFilters.enabled} onValueChange={(value) => setDraftFilter("enabled", value as BooleanFilter)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Enabled" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Enabled: vše</SelectItem>
                <SelectItem value="true">Enabled</SelectItem>
                <SelectItem value="false">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={draftFilters.deleted} onValueChange={(value) => setDraftFilter("deleted", value as BooleanFilter)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Deleted" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Deleted: vše</SelectItem>
                <SelectItem value="false">Aktivní</SelectItem>
                <SelectItem value="true">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
              Hledat
            </Button>
            <Button type="button" variant="ghost" onClick={handleReset}>
              <X className="h-4 w-4" />
              Reset
            </Button>
          </form>
        </CardContent>
      </Card>

      {showCreateForm ? (
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Create User</p>
              <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                Nový user
              </h2>
            </div>
            <UserForm
              initialCompany={submittedCompany}
              initialValues={createInitialValues}
              isSubmitting={createMutation.isPending}
              onCancel={() => setShowCreateForm(false)}
              onSubmit={(values) => createMutation.mutate(values)}
              submitLabel="Vytvořit usera"
            />
          </CardContent>
        </Card>
      ) : null}

      {usersQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám usery...</CardContent>
        </Card>
      ) : usersQuery.isError ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(usersQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-white/80 bg-white/90">
            <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-slate-600">
              <UserRound className="h-4 w-4 text-emerald-700" />
              <span>Načteno: {users.length}</span>
              <span>{activeFilterLabel}</span>
              <span>Company: {submittedCompany ? `${submittedCompany.name} (#${submittedCompany.id})` : "bez filtru"}</span>
              <span>Page size: {USERS_PAGE_SIZE}</span>
              {usersQuery.hasNextPage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={usersQuery.isFetchingNextPage}
                  onClick={() => usersQuery.fetchNextPage()}
                >
                  {usersQuery.isFetchingNextPage ? "Načítám..." : "Načíst další"}
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <DataTable
            data={users}
            keyExtractor={(user) => String(user.id)}
            emptyMessage="Žádný user neodpovídá aktuálním filtrům."
            columns={[
              {
                header: "User",
                className: "min-w-[260px]",
                render: (user) => (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{formatName([user.givenName, user.familyName])}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ID {user.id}</p>
                    <p className="text-sm text-slate-600">{user.email ?? "Bez e-mailu"}</p>
                    <p className="text-sm text-slate-600">{user.phone ?? "Bez telefonu"}</p>
                  </div>
                ),
              },
              {
                header: "Company",
                render: (user) =>
                  user.company ? (
                    <Link className="text-emerald-700 underline-offset-4 hover:underline" href={`/companies/${user.company.id}`}>
                      {user.company.name}
                    </Link>
                  ) : user.companyId ? (
                    <Link className="text-emerald-700 underline-offset-4 hover:underline" href={`/companies/${user.companyId}`}>
                      Company #{user.companyId}
                    </Link>
                  ) : (
                    "—"
                  ),
              },
              {
                header: "Role",
                render: (user) => (
                  <div className="flex flex-wrap gap-2">
                    {roleBadges(user.roles).map((role) => (
                      <Badge key={role} className="bg-slate-100 text-slate-800">
                        {role}
                      </Badge>
                    ))}
                  </div>
                ),
              },
              {
                header: "Flags",
                render: (user) => (
                  <div className="flex flex-wrap gap-2">
                    <Badge className={user.enabled ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}>
                      {user.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    {user.hideProfile ? <Badge className="bg-amber-100 text-amber-900">Hidden</Badge> : null}
                    {user.deletedAt ? <Badge className="bg-rose-100 text-rose-900">Deleted</Badge> : null}
                  </div>
                ),
              },
              {
                header: "HubSpot",
                render: (user) => {
                  const hubspotUrl = getSafeExternalUrl(user.hubspotLink);
                  return hubspotUrl ? (
                    <a className="text-emerald-700 underline-offset-4 hover:underline" href={hubspotUrl} target="_blank" rel="noreferrer">
                      Otevřít
                    </a>
                  ) : (
                    "—"
                  );
                },
              },
              {
                header: "Updated",
                render: (user) => (
                  <div className="space-y-1">
                    <p>{formatDateTime(user.updatedAt)}</p>
                    <p className="text-xs text-slate-500">Created: {formatDateTime(user.createdAt)}</p>
                  </div>
                ),
              },
              {
                header: "Detail",
                render: (user) => (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/users/${user.id}`}>Otevřít</Link>
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
