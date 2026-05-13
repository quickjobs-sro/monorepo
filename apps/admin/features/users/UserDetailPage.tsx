"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BriefcaseBusiness, CheckCircle2, EyeOff, SquareArrowOutUpRight, UserRound } from "lucide-react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@ui/components/core/badge";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { useToast } from "@ui/hooks/use-toast";
import { MetricCard } from "@/components/admin-shell/MetricCard";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import { getErrorMessage } from "@/lib/errors";
import { formatCompactNumber, formatDateTime, formatJobTerm, formatName } from "@/lib/formatting";
import type { AdminUserJobReaction } from "@/lib/openapi/types";
import { getSafeExternalUrl } from "../companies/companyFormData";
import { companyUsersRootQueryKey } from "../companies/queries";
import {
  fetchUserDetail,
  fetchUserJobReactions,
  updateUser,
  type UserJobReactionSource,
  type UserJobReactionStatus,
} from "./api";
import { UserForm } from "./UserForm";
import { formValuesToUserPayload, userToFormValues, type UserFormValues } from "./userFormData";
import { userDetailQueryKey, userJobReactionsQueryKey, usersQueryKey } from "./queries";

const USER_REACTIONS_PAGE_SIZE = 25;

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

function reactionJobTitle(reaction: AdminUserJobReaction): string {
  return reaction.job.title ?? reaction.job.description ?? `Job #${reaction.jobId}`;
}

function reactionDetailHref(reaction: AdminUserJobReaction): string {
  return reaction.source === "internal" ? `/jobs/${reaction.jobId}` : `/external-jobs/${reaction.jobId}`;
}

function ReactionSection({ source, status, title, userId }: ReactionSectionProps) {
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

  const reactions = reactionsQuery.data?.pages.flatMap((page) => page.reactions) ?? [];

  if (reactionsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-500">Načítám {title.toLowerCase()}...</CardContent>
      </Card>
    );
  }

  if (reactionsQuery.isError) {
    return (
      <Card className="border-rose-200 bg-rose-50/80">
        <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(reactionsQuery.error)}</CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{source}</p>
          <h2 className="font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">{title}</h2>
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
                <p className="font-medium text-slate-900">{reactionJobTitle(reaction)}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Reaction #{reaction.id}</p>
                <p className="text-sm text-slate-600">Job ID {reaction.jobId}</p>
              </div>
            ),
          },
          {
            header: "Term / status",
            render: (reaction) => (
              <div className="space-y-2">
                <Badge className={reaction.status === "applied" ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-800"}>
                  {reaction.status}
                </Badge>
                <p className="text-sm text-slate-600">{formatJobTerm(reaction.job.term)}</p>
                <p className="text-sm text-slate-600">{reaction.job.status ?? "Bez statusu"}</p>
              </div>
            ),
          },
          {
            header: "Source",
            render: (reaction) => (
              <div className="space-y-1">
                <p>{reaction.source}</p>
                <p className="text-xs text-slate-500">{reaction.job.feedName ?? "Bez feedu"}</p>
              </div>
            ),
          },
          {
            header: "Updated",
            render: (reaction) => (
              <div className="space-y-1">
                <p>{formatDateTime(reaction.updatedAt)}</p>
                <p className="text-xs text-slate-500">Created: {formatDateTime(reaction.createdAt)}</p>
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
              {reactionsQuery.isFetchingNextPage ? "Načítám..." : "Načíst další"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

export function UserDetailPage({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const userDetailQuery = useQuery({
    queryKey: userDetailQueryKey(userId),
    queryFn: () => fetchUserDetail(userId),
  });

  const updateMutation = useMutation({
    mutationFn: (values: UserFormValues) => updateUser(userId, formValuesToUserPayload(values)),
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
  const userName = user ? formatName([user.givenName, user.familyName]) : `User #${userId}`;
  const editInitialValues = useMemo(() => (user ? userToFormValues(user) : null), [user]);
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
          <CardContent className="p-6 text-sm text-slate-500">Načítám detail usera...</CardContent>
        </Card>
      ) : userDetailQuery.isError || !user || !editInitialValues ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(userDetailQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Internal Applied" value={formatCompactNumber(user.reactionCounts.internalApplied)} hint="Count z detail endpointu." icon={CheckCircle2} />
            <MetricCard title="Internal Ignored" value={formatCompactNumber(user.reactionCounts.internalIgnored)} hint="Count z detail endpointu." icon={EyeOff} />
            <MetricCard title="External Applied" value={formatCompactNumber(user.reactionCounts.externalApplied)} hint="Count z detail endpointu." icon={BriefcaseBusiness} />
            <MetricCard title="External Ignored" value={formatCompactNumber(user.reactionCounts.externalIgnored)} hint="Count z detail endpointu." icon={UserRound} />
          </div>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="grid gap-4 p-6 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Kontakt</p>
                <p className="mt-2 font-medium text-slate-900">{user.email ?? "Bez e-mailu"}</p>
                <p className="text-sm text-slate-600">{user.phone ?? "Bez telefonu"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Company</p>
                {user.company ? (
                  <Link className="mt-2 block text-emerald-700 underline-offset-4 hover:underline" href={`/companies/${user.company.id}`}>
                    {user.company.name}
                  </Link>
                ) : (
                  <p className="mt-2 text-slate-600">{user.companyId ? `Company #${user.companyId}` : "Bez firmy"}</p>
                )}
                <p className="text-sm text-slate-600">Company name: {user.companyName ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Flags</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className={user.enabled ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}>
                    {user.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {user.hideProfile ? <Badge className="bg-amber-100 text-amber-900">Hidden</Badge> : null}
                  {user.deletedAt ? <Badge className="bg-rose-100 text-rose-900">Deleted</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">Updated: {formatDateTime(user.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Edit User</p>
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

          <ReactionSection userId={userId} source="internal" status="applied" title="Internal applied joby" />
          <ReactionSection userId={userId} source="internal" status="ignored" title="Internal ignored joby" />
          <ReactionSection userId={userId} source="external" status="applied" title="External applied joby" />
          <ReactionSection userId={userId} source="external" status="ignored" title="External ignored joby" />
        </>
      )}
    </div>
  );
}
