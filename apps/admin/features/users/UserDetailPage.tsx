"use client";

import Link from "next/link";
import { type KeyboardEvent, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  EyeOff,
  SquareArrowOutUpRight,
  UserRound,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/core/select";
import { useToast } from "@ui/hooks/use-toast";
import { MetricCard } from "@/components/admin-shell/MetricCard";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import { getErrorMessage } from "@/lib/errors";
import {
  formatCompactNumber,
  formatDateTime,
  formatJobTerm,
  formatName,
  formatPercent,
} from "@/lib/formatting";
import type { AdminUserJob, AdminUserJobReaction } from "@/lib/openapi/types";
import { getSafeExternalUrl } from "../companies/companyFormData";
import { companyUsersRootQueryKey } from "../companies/queries";
import {
  fetchUserDetail,
  fetchUserJobReactions,
  fetchUserJobs,
  updateUser,
  type AdminUserJobStatus,
  type UserJobReactionSource,
  type UserJobReactionStatus,
} from "./api";
import { UserForm } from "./UserForm";
import {
  formValuesToUserPayload,
  userToFormValues,
  type UserFormValues,
} from "./userFormData";
import {
  userDetailQueryKey,
  userJobReactionsQueryKey,
  userJobsQueryKey,
  usersQueryKey,
} from "./queries";
import {
  buildUserJobsQueryParams,
  getUserJobsStatusOptions,
  getUserJobsTermOptions,
  type UserJobsStatusFilter,
  type UserJobsTermFilter,
} from "./userJobsFilters";

const USER_REACTIONS_PAGE_SIZE = 25;

type UserActivityTab =
  | "authored-jobs"
  | "internal-applied"
  | "internal-ignored"
  | "external-applied"
  | "external-ignored";

const USER_ACTIVITY_TABS: Array<{
  value: UserActivityTab;
  label: string;
}> = [
  { value: "authored-jobs", label: "Authored jobs" },
  { value: "internal-applied", label: "Internal applied" },
  { value: "internal-ignored", label: "Internal ignored" },
  { value: "external-applied", label: "External applied" },
  { value: "external-ignored", label: "External ignored" },
];

const USER_JOB_STATUS_LABELS: Record<AdminUserJobStatus, string> = {
  active: "Active",
  expired: "Expired",
  draft: "Draft",
  archived: "Archived",
  banned: "Banned",
  not_relevant: "Not relevant",
};

type ReactionPageParam = {
  beforeUpdatedAt?: string;
  beforeId?: number;
};

type ReactionSectionProps = {
  source: UserJobReactionSource;
  status: UserJobReactionStatus;
  title: string;
  userId: string;
};

function formatUserJobStatus(status: AdminUserJobStatus): string {
  return USER_JOB_STATUS_LABELS[status] ?? status;
}

function formatTermFilter(term: UserJobsTermFilter): string {
  return term === "all" ? "Všechny termy" : formatJobTerm(term);
}

function formatStatusFilter(status: UserJobsStatusFilter): string {
  return status === "all" ? "Všechny statusy" : formatUserJobStatus(status);
}

function getNextActivityTab(
  currentTab: UserActivityTab,
  key: string,
): UserActivityTab | null {
  const currentIndex = USER_ACTIVITY_TABS.findIndex(
    (tab) => tab.value === currentTab,
  );
  if (currentIndex < 0) {
    return null;
  }

  if (key === "Home") {
    return USER_ACTIVITY_TABS[0]?.value ?? null;
  }

  if (key === "End") {
    return USER_ACTIVITY_TABS.at(-1)?.value ?? null;
  }

  if (key === "ArrowRight") {
    return (
      USER_ACTIVITY_TABS[(currentIndex + 1) % USER_ACTIVITY_TABS.length]
        ?.value ?? null
    );
  }

  if (key === "ArrowLeft") {
    return (
      USER_ACTIVITY_TABS[
        (currentIndex - 1 + USER_ACTIVITY_TABS.length) %
          USER_ACTIVITY_TABS.length
      ]?.value ?? null
    );
  }

  return null;
}

function reactionJobTitle(reaction: AdminUserJobReaction): string {
  return (
    reaction.job.title ?? reaction.job.description ?? `Job #${reaction.jobId}`
  );
}

function reactionDetailHref(reaction: AdminUserJobReaction): string {
  return reaction.source === "internal"
    ? `/jobs/${reaction.jobId}`
    : `/external-jobs/${reaction.jobId}`;
}

function AuthoredJobsSection({ userId }: { userId: string }) {
  const [termFilter, setTermFilter] = useState<UserJobsTermFilter>("all");
  const [statusFilter, setStatusFilter] = useState<UserJobsStatusFilter>("all");
  const queryParams = useMemo(
    () =>
      buildUserJobsQueryParams({
        term: termFilter,
        status: statusFilter,
      }),
    [termFilter, statusFilter],
  );
  const jobsQuery = useInfiniteQuery({
    queryKey: userJobsQueryKey(userId, queryParams),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      fetchUserJobs(userId, {
        ...queryParams,
        afterId: typeof pageParam === "number" ? pageParam : undefined,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pageInfo.hasNext) {
        return undefined;
      }

      return lastPage.jobs.at(-1)?.id;
    },
  });
  const jobs = jobsQuery.data?.pages.flatMap((page) => page.jobs) ?? [];

  if (jobsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-500">
          Načítám authored joby...
        </CardContent>
      </Card>
    );
  }

  if (jobsQuery.isError) {
    return (
      <Card className="border-rose-200 bg-rose-50/80">
        <CardContent className="p-6 text-sm text-rose-700">
          {getErrorMessage(jobsQuery.error)}
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            owned / authored
          </p>
          <h2 className="font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
            Authored jobs
          </h2>
          <p className="mt-1 text-sm text-slate-600">Načteno: {jobs.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={termFilter}
            onValueChange={(value) =>
              setTermFilter(value as UserJobsTermFilter)
            }
          >
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              {getUserJobsTermOptions().map((term) => (
                <SelectItem key={term} value={term}>
                  {formatTermFilter(term)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as UserJobsStatusFilter)
            }
          >
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {getUserJobsStatusOptions().map((status) => (
                <SelectItem key={status} value={status}>
                  {formatStatusFilter(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        data={jobs}
        keyExtractor={(job: AdminUserJob) => String(job.id)}
        emptyMessage="User zatím nemá žádné authored/owned joby pro aktuální filtr."
        columns={[
          {
            header: "Job",
            className: "min-w-[280px]",
            render: (job) => (
              <div className="space-y-1">
                <Link
                  className="font-medium text-emerald-700 underline-offset-4 hover:underline"
                  href={`/jobs/${job.id}`}
                >
                  {job.title || `Job #${job.id}`}
                </Link>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  ID {job.id}
                </p>
                {job.companyId ? (
                  <Link
                    className="text-sm text-slate-600 underline-offset-4 hover:underline"
                    href={`/companies/${job.companyId}`}
                  >
                    {job.companyName ?? `Company #${job.companyId}`}
                  </Link>
                ) : (
                  <p className="text-sm text-slate-500">Bez firmy</p>
                )}
              </div>
            ),
          },
          {
            header: "Term / status",
            render: (job) => (
              <div className="space-y-2">
                <Badge className="bg-emerald-100 text-emerald-900">
                  {formatJobTerm(job.term)}
                </Badge>
                <p className="text-sm text-slate-600">
                  {formatUserJobStatus(job.status)}
                </p>
              </div>
            ),
          },
          {
            header: "Stats",
            render: (job) => (
              <div className="space-y-1">
                <p>Visits: {formatCompactNumber(job.stats.visits)}</p>
                <p>
                  Applications: {formatCompactNumber(job.stats.applications)}
                </p>
                <p>Conversion: {formatPercent(job.stats.conversionRate)}</p>
              </div>
            ),
          },
          {
            header: "Outcome",
            render: (job) => (
              <div className="space-y-1">
                <p>
                  Accepted:{" "}
                  {formatCompactNumber(job.stats.acceptedApplications)}
                </p>
                <p>
                  Rejected:{" "}
                  {formatCompactNumber(job.stats.rejectedApplications)}
                </p>
              </div>
            ),
          },
          {
            header: "Dates",
            render: (job) => (
              <div className="space-y-1">
                <p>Updated: {formatDateTime(job.updatedAt)}</p>
                <p className="text-sm text-slate-600">
                  Expires: {formatDateTime(job.offerExpiresAt)}
                </p>
              </div>
            ),
          },
        ]}
      />

      {jobsQuery.hasNextPage ? (
        <Card className="border-white/80 bg-white/90">
          <CardContent className="p-4">
            <Button
              type="button"
              variant="outline"
              disabled={jobsQuery.isFetchingNextPage}
              onClick={() => jobsQuery.fetchNextPage()}
            >
              {jobsQuery.isFetchingNextPage
                ? "Načítám..."
                : "Načíst další authored joby"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function ReactionSection({
  source,
  status,
  title,
  userId,
}: ReactionSectionProps) {
  const reactionsQuery = useInfiniteQuery({
    queryKey: userJobReactionsQueryKey(userId, source, status),
    initialPageParam: undefined as ReactionPageParam | undefined,
    queryFn: ({ pageParam }) =>
      fetchUserJobReactions(userId, {
        source,
        status: [status],
        limit: USER_REACTIONS_PAGE_SIZE,
        beforeUpdatedAt: pageParam?.beforeUpdatedAt,
        beforeId: pageParam?.beforeId,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pageInfo.hasNext) {
        return undefined;
      }

      const lastItem = lastPage.reactions.at(-1);
      return lastItem
        ? {
            beforeUpdatedAt: lastItem.updatedAt,
            beforeId: lastItem.id,
          }
        : undefined;
    },
  });

  const reactions =
    reactionsQuery.data?.pages.flatMap((page) => page.reactions) ?? [];

  if (reactionsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-500">
          Načítám {title.toLowerCase()}...
        </CardContent>
      </Card>
    );
  }

  if (reactionsQuery.isError) {
    return (
      <Card className="border-rose-200 bg-rose-50/80">
        <CardContent className="p-6 text-sm text-rose-700">
          {getErrorMessage(reactionsQuery.error)}
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {source}
          </p>
          <h2 className="font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
            {title}
          </h2>
        </div>
        <p className="text-sm text-slate-600">Načteno: {reactions.length}</p>
      </div>

      <DataTable
        data={reactions}
        keyExtractor={(reaction) => String(reaction.id)}
        emptyMessage="V této sekci nejsou žádné reakce."
        columns={[
          {
            header: "Job",
            className: "min-w-[300px]",
            render: (reaction) => (
              <div className="space-y-1">
                <p className="font-medium text-slate-900">
                  {reactionJobTitle(reaction)}
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Reaction #{reaction.id}
                </p>
                <p className="text-sm text-slate-600">
                  Job ID {reaction.jobId}
                </p>
              </div>
            ),
          },
          {
            header: "Term / status",
            render: (reaction) => (
              <div className="space-y-2">
                <Badge
                  className={
                    reaction.status === "applied"
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-slate-200 text-slate-800"
                  }
                >
                  {reaction.status}
                </Badge>
                <p className="text-sm text-slate-600">
                  {formatJobTerm(reaction.job.term)}
                </p>
                <p className="text-sm text-slate-600">
                  {reaction.job.status ?? "Bez statusu"}
                </p>
              </div>
            ),
          },
          {
            header: "Source",
            render: (reaction) => (
              <div className="space-y-1">
                <p>{reaction.source}</p>
                <p className="text-xs text-slate-500">
                  {reaction.job.feedName ?? "Bez feedu"}
                </p>
              </div>
            ),
          },
          {
            header: "Updated",
            render: (reaction) => (
              <div className="space-y-1">
                <p>{formatDateTime(reaction.updatedAt)}</p>
                <p className="text-xs text-slate-500">
                  Created: {formatDateTime(reaction.createdAt)}
                </p>
              </div>
            ),
          },
          {
            header: "Detail",
            render: (reaction) => {
              const safeUrl = getSafeExternalUrl(reaction.job.url);
              return (
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={reactionDetailHref(reaction)}>Detail</Link>
                  </Button>
                  {safeUrl ? (
                    <Button asChild size="sm" variant="ghost">
                      <a href={safeUrl} target="_blank" rel="noreferrer">
                        URL
                      </a>
                    </Button>
                  ) : null}
                </div>
              );
            },
          },
        ]}
      />

      {reactionsQuery.hasNextPage ? (
        <Card className="border-white/80 bg-white/90">
          <CardContent className="p-4">
            <Button
              type="button"
              variant="outline"
              disabled={reactionsQuery.isFetchingNextPage}
              onClick={() => reactionsQuery.fetchNextPage()}
            >
              {reactionsQuery.isFetchingNextPage
                ? "Načítám..."
                : "Načíst další"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

export function UserDetailPage({ userId }: { userId: string }) {
  const [activeActivityTab, setActiveActivityTab] =
    useState<UserActivityTab>("authored-jobs");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const userDetailQuery = useQuery({
    queryKey: userDetailQueryKey(userId),
    queryFn: () => fetchUserDetail(userId),
  });

  const updateMutation = useMutation({
    mutationFn: (values: UserFormValues) =>
      updateUser(userId, formValuesToUserPayload(values)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userDetailQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: usersQueryKey }),
        queryClient.invalidateQueries({ queryKey: companyUsersRootQueryKey }),
      ]);
      toast({
        title: "User uložen",
        description: "Detail usera se znovu načetl z admin endpointu.",
      });
    },
    onError: (error) => {
      toast({
        title: "Uložení usera selhalo",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const user = userDetailQuery.data?.data;
  const hubspotUrl = getSafeExternalUrl(user?.hubspotLink);
  const userName = user
    ? formatName([user.givenName, user.familyName])
    : `User #${userId}`;
  const editInitialValues = useMemo(
    () => (user ? userToFormValues(user) : null),
    [user],
  );
  const initialCompany = user?.company
    ? {
        id: user.company.id,
        name: user.company.name,
      }
    : user?.companyId
      ? {
          id: user.companyId,
          name: `Company #${user.companyId}`,
        }
      : null;

  function handleActivityTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const nextTab = getNextActivityTab(activeActivityTab, event.key);
    if (!nextTab) {
      return;
    }

    event.preventDefault();
    setActiveActivityTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(`user-activity-tab-${nextTab}`)?.focus();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Users"
        title={userName}
        description="Admin detail usera: aktuální company vazba, editace a job reactions bez N+1 detail requestů."
        actions={
          <div className="flex flex-wrap gap-3">
            {hubspotUrl ? (
              <Button asChild>
                <a href={hubspotUrl} target="_blank" rel="noreferrer">
                  <SquareArrowOutUpRight className="h-4 w-4" />
                  HubSpot
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/users">Zpět na usery</Link>
            </Button>
          </div>
        }
      />

      {userDetailQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">
            Načítám detail usera...
          </CardContent>
        </Card>
      ) : userDetailQuery.isError || !user || !editInitialValues ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">
            {getErrorMessage(userDetailQuery.error)}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Internal Applied"
              value={formatCompactNumber(user.reactionCounts.internalApplied)}
              hint="Count z detail endpointu."
              icon={CheckCircle2}
            />
            <MetricCard
              title="Internal Ignored"
              value={formatCompactNumber(user.reactionCounts.internalIgnored)}
              hint="Count z detail endpointu."
              icon={EyeOff}
            />
            <MetricCard
              title="External Applied"
              value={formatCompactNumber(user.reactionCounts.externalApplied)}
              hint="Count z detail endpointu."
              icon={BriefcaseBusiness}
            />
            <MetricCard
              title="External Ignored"
              value={formatCompactNumber(user.reactionCounts.externalIgnored)}
              hint="Count z detail endpointu."
              icon={UserRound}
            />
          </div>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="grid gap-4 p-6 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Kontakt
                </p>
                <p className="mt-2 font-medium text-slate-900">
                  {user.email ?? "Bez e-mailu"}
                </p>
                <p className="text-sm text-slate-600">
                  {user.phone ?? "Bez telefonu"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Company
                </p>
                {user.company ? (
                  <Link
                    className="mt-2 block text-emerald-700 underline-offset-4 hover:underline"
                    href={`/companies/${user.company.id}`}
                  >
                    {user.company.name}
                  </Link>
                ) : (
                  <p className="mt-2 text-slate-600">
                    {user.companyId
                      ? `Company #${user.companyId}`
                      : "Bez firmy"}
                  </p>
                )}
                <p className="text-sm text-slate-600">
                  Company name: {user.companyName ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Flags
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    className={
                      user.enabled
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-rose-100 text-rose-900"
                    }
                  >
                    {user.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {user.hideProfile ? (
                    <Badge className="bg-amber-100 text-amber-900">
                      Hidden
                    </Badge>
                  ) : null}
                  {user.deletedAt ? (
                    <Badge className="bg-rose-100 text-rose-900">Deleted</Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Updated: {formatDateTime(user.updatedAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Edit User
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                  Úprava usera
                </h2>
              </div>
              <UserForm
                initialCompany={initialCompany}
                initialValues={editInitialValues}
                isSubmitting={updateMutation.isPending}
                onSubmit={(values) => updateMutation.mutate(values)}
                submitLabel="Uložit usera"
              />
            </CardContent>
          </Card>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  User Activity
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                  Joby a reakce
                </h2>
              </div>
              <div
                className="inline-flex flex-wrap rounded-md border border-slate-200 bg-slate-100 p-1"
                role="tablist"
                aria-label="User activity"
              >
                {USER_ACTIVITY_TABS.map((tab) => {
                  const isActive = activeActivityTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      id={`user-activity-tab-${tab.value}`}
                      role="tab"
                      aria-controls={`user-activity-panel-${tab.value}`}
                      aria-selected={isActive}
                      className={`rounded-sm px-3 py-1.5 text-sm font-medium transition ${
                        isActive
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-600 hover:text-slate-950"
                      }`}
                      tabIndex={isActive ? 0 : -1}
                      onKeyDown={handleActivityTabKeyDown}
                      onClick={() => setActiveActivityTab(tab.value)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeActivityTab === "authored-jobs" ? (
              <div
                id="user-activity-panel-authored-jobs"
                role="tabpanel"
                aria-labelledby="user-activity-tab-authored-jobs"
              >
                <AuthoredJobsSection userId={userId} />
              </div>
            ) : null}
            {activeActivityTab === "internal-applied" ? (
              <div
                id="user-activity-panel-internal-applied"
                role="tabpanel"
                aria-labelledby="user-activity-tab-internal-applied"
              >
                <ReactionSection
                  userId={userId}
                  source="internal"
                  status="applied"
                  title="Internal applied joby"
                />
              </div>
            ) : null}
            {activeActivityTab === "internal-ignored" ? (
              <div
                id="user-activity-panel-internal-ignored"
                role="tabpanel"
                aria-labelledby="user-activity-tab-internal-ignored"
              >
                <ReactionSection
                  userId={userId}
                  source="internal"
                  status="ignored"
                  title="Internal ignored joby"
                />
              </div>
            ) : null}
            {activeActivityTab === "external-applied" ? (
              <div
                id="user-activity-panel-external-applied"
                role="tabpanel"
                aria-labelledby="user-activity-tab-external-applied"
              >
                <ReactionSection
                  userId={userId}
                  source="external"
                  status="applied"
                  title="External applied joby"
                />
              </div>
            ) : null}
            {activeActivityTab === "external-ignored" ? (
              <div
                id="user-activity-panel-external-ignored"
                role="tabpanel"
                aria-labelledby="user-activity-tab-external-ignored"
              >
                <ReactionSection
                  userId={userId}
                  source="external"
                  status="ignored"
                  title="External ignored joby"
                />
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
