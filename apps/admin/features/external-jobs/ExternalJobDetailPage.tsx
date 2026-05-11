"use client";

import Link from "next/link";
import { Clock3, ExternalLink, Rss } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@ui/components/core/badge";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { MetricCard } from "@/components/admin-shell/MetricCard";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatJobTerm, formatRelativeDateTime } from "@/lib/formatting";
import { fetchExternalJobDetail } from "./api";
import { externalJobDetailQueryKey } from "./queries";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatObjectLabel(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (!isRecord(value)) {
    return "—";
  }

  const candidate = value.name ?? value.label ?? value.status ?? value.value ?? value.id;
  if (typeof candidate === "string" || typeof candidate === "number" || typeof candidate === "boolean") {
    return String(candidate);
  }

  const entries = Object.entries(value)
    .filter(([, nestedValue]) => nestedValue != null)
    .slice(0, 3)
    .map(([key, nestedValue]) => `${key}: ${String(nestedValue)}`);

  return entries.length ? entries.join(", ") : "—";
}

export function ExternalJobDetailPage({ jobId }: { jobId: string }) {
  const jobDetailQuery = useQuery({
    queryKey: externalJobDetailQueryKey(jobId),
    queryFn: () => fetchExternalJobDetail(jobId),
  });

  const job = jobDetailQuery.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="External Jobs"
        title={job?.title ?? job?.description ?? `External job #${jobId}`}
        description="Detail externího jobu z canonical feed endpointu bez mutací a bez import webhook akcí."
        actions={
          <Button asChild variant="outline">
            <Link href="/external-jobs">Zpět na external jobs</Link>
          </Button>
        }
      />

      {jobDetailQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám externí job...</CardContent>
        </Card>
      ) : jobDetailQuery.isError || !job ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(jobDetailQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard title="Feed" value={job.feedName} hint="Zdroj externí nabídky." icon={Rss} />
            <MetricCard
              title="Status"
              value={formatObjectLabel(job.status)}
              hint={`Term: ${formatJobTerm(formatObjectLabel(job.term))}`}
              icon={ExternalLink}
            />
            <MetricCard
              title="Updated"
              value={formatRelativeDateTime(job.updatedAt)}
              hint={formatDateTime(job.updatedAt)}
              icon={Clock3}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-white/80 bg-white/90">
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-slate-100 text-slate-800">{job.feedName}</Badge>
                  <Badge className="bg-slate-100 text-slate-800">{formatObjectLabel(job.status)}</Badge>
                  {job.viewer.reaction ? (
                    <Badge className="bg-emerald-100 text-emerald-900">{job.viewer.reaction.status}</Badge>
                  ) : null}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Popis</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{job.description}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Place</p>
                    <p className="mt-2 text-sm text-slate-700">{formatObjectLabel(job.place)}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Author</p>
                    <p className="mt-2 text-sm text-slate-700">{formatObjectLabel(job.author)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/90">
              <CardContent className="space-y-5 p-6 text-sm text-slate-700">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Časy</p>
                  <p className="mt-2">Vytvořeno: {formatDateTime(job.createdAt)}</p>
                  <p>Aktualizováno: {formatDateTime(job.updatedAt)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Viewer reaction</p>
                  {job.viewer.reaction ? (
                    <div className="mt-2 space-y-1">
                      <p>Status: {job.viewer.reaction.status}</p>
                      <p>Saved: {formatDateTime(job.viewer.reaction.savedAt)}</p>
                      <p>Note: {job.viewer.reaction.note ?? "—"}</p>
                    </div>
                  ) : (
                    <p className="mt-2">Bez reaction ve viewer objektu.</p>
                  )}
                </div>

                <Button asChild className="w-full">
                  <a href={job.url} target="_blank" rel="noreferrer">
                    Otevřít externí URL
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
