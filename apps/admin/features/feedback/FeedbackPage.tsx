"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/core/select";
import { DataTable } from "@/components/data-table/DataTable";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatName } from "@/lib/formatting";
import { fetchFeedback } from "./api";
import { feedbackQueryKey } from "./queries";
import type { FeedbackCursorState } from "./types";

export function FeedbackPage() {
  const [limit, setLimit] = useState("10");
  const [cursor, setCursor] = useState<FeedbackCursorState>({});

  const feedbackQuery = useQuery({
    queryKey: feedbackQueryKey({ ...cursor, limit: Number(limit) }),
    queryFn: () =>
      fetchFeedback({
        ...cursor,
        limit: Number(limit),
      }),
  });

  const items = feedbackQuery.data?.feedback ?? [];
  const pageInfo = feedbackQuery.data?.pageInfo;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Feedback"
        description="Read-only seznam nad `/admin/feedback` s cursor navigací kompatibilní s dnešním backendem."
        actions={
          <>
            <Select
              value={limit}
              onValueChange={(value) => {
                setLimit(value);
                setCursor({});
              }}
            >
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / stránka</SelectItem>
                <SelectItem value="20">20 / stránka</SelectItem>
                <SelectItem value="50">50 / stránka</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" disabled={!pageInfo?.hasPrevious || items.length === 0} onClick={() => setCursor({ since: items[0]?.createdAt })}>
              Novější
            </Button>
            <Button variant="outline" disabled={!pageInfo?.hasNext || items.length === 0} onClick={() => setCursor({ until: items.at(-1)?.createdAt })}>
              Starší
            </Button>
            <Button variant="ghost" onClick={() => setCursor({})}>
              Reset
            </Button>
          </>
        }
      />

      {feedbackQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám feedback...</CardContent>
        </Card>
      ) : feedbackQuery.isError ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(feedbackQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-white/80 bg-white/90">
            <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-slate-600">
              <span>Načteno: {items.length}</span>
              <span>Novější k dispozici: {pageInfo?.hasPrevious ? "ano" : "ne"}</span>
              <span>Starší k dispozici: {pageInfo?.hasNext ? "ano" : "ne"}</span>
            </CardContent>
          </Card>
          <DataTable
            data={items}
            keyExtractor={(item) => String(item.id)}
            emptyMessage="Feedback endpoint zatím nevrátil žádné záznamy."
            columns={[
              {
                header: "Čas",
                render: (item) => <span className="font-medium text-slate-900">{formatDateTime(item.createdAt)}</span>,
              },
              {
                header: "Rating",
                render: (item) => <span>{item.rating ?? "—"} / 5</span>,
              },
              {
                header: "Zpráva",
                className: "min-w-[320px]",
                render: (item) => <p className="max-w-xl whitespace-pre-wrap leading-6 text-slate-700">{item.message ?? "Bez textu"}</p>,
              },
              {
                header: "Uživatel",
                render: (item) => (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{formatName([item.user?.givenName, item.user?.familyName])}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ID {item.id}</p>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
