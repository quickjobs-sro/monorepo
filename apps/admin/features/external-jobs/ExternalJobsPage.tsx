"use client";

import Link from "next/link";
import { useState } from "react";
import { BriefcaseBusiness, Clock3, Database, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { MetricCard } from "@/components/admin-shell/MetricCard";
import { PageHeader } from "@/components/admin-shell/PageHeader";
import { DataTable } from "@/components/data-table/DataTable";
import { getErrorMessage } from "@/lib/errors";
import { formatCompactNumber, formatDateTime, formatJobTerm, formatRelativeDateTime } from "@/lib/formatting";
import { JOB_TERMS } from "@/lib/openapi/types";
import { fetchExternalJobs } from "./api";
import { externalJobsQueryKey } from "./queries";
import type { JobsTermFilter } from "@/features/jobs/types";

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

  const keys = Object.keys(value);
  return keys.length ? keys.join(", ") : "—";
}

export function ExternalJobsPage() {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState<JobsTermFilter>("all");
  const [limit, setLimit] = useState("50");
  const activeTerms = term === "all" ? [...JOB_TERMS] : [term];
  const numericLimit = Number(limit);

  const externalJobsQuery = useQuery({
    queryKey: externalJobsQueryKey(activeTerms, numericLimit),
    queryFn: () =>
      fetchExternalJobs({
        term: activeTerms,
        limit: numericLimit,
      }),
  });

  const jobs = externalJobsQuery.data?.data ?? [];
  const filteredJobs = jobs.filter((job) => {
    const haystack = [
      job.title,
      job.description,
      job.feedName,
      formatObjectLabel(job.status),
      formatObjectLabel(job.author),
      formatObjectLabel(job.place),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search.trim().toLowerCase());
  });
  const reactedJobs = filteredJobs.filter((job) => job.viewer.reaction).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="External Jobs"
        description="Read-only QA pohled nad externími feedy z `/v1/external-jobs`, omezený limitem bez detail fetchů v listu."
        actions={
          <>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hledat feed, název nebo autora"
              wrapperProps={{ className: "w-full max-w-xs" }}
            />
            <Select value={term} onValueChange={(value) => setTerm(value as JobsTermFilter)}>
              <SelectTrigger className="w-[170px] bg-white">
                <SelectValue placeholder="Typ práce" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny termy</SelectItem>
                <SelectItem value="one_time">Jednorázově</SelectItem>
                <SelectItem value="long_term">Dlouhodobě</SelectItem>
                <SelectItem value="full_time">Plný úvazek</SelectItem>
              </SelectContent>
            </Select>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {externalJobsQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám externí joby...</CardContent>
        </Card>
      ) : externalJobsQuery.isError ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(externalJobsQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Loaded Jobs"
              value={formatCompactNumber(filteredJobs.length)}
              hint={`Backend limit ${externalJobsQuery.data?.meta.limit ?? numericLimit}`}
              icon={BriefcaseBusiness}
            />
            <MetricCard
              title="Feeds"
              value={formatCompactNumber(new Set(filteredJobs.map((job) => job.feedName)).size)}
              hint="Počet unikátních feedů ve filtrovaném řezu."
              icon={Database}
            />
            <MetricCard
              title="Viewer Reactions"
              value={formatCompactNumber(reactedJobs)}
              hint="Externí joby s reaction ve viewer objektu."
              icon={ExternalLink}
            />
            <MetricCard
              title="Newest Update"
              value={formatRelativeDateTime(filteredJobs[0]?.updatedAt)}
              hint={formatDateTime(filteredJobs[0]?.updatedAt)}
              icon={Clock3}
            />
          </div>

          <DataTable
            data={filteredJobs}
            keyExtractor={(job) => String(job.id)}
            emptyMessage="Externí joby pro tenhle řez nejsou k dispozici."
            columns={[
              {
                header: "Job",
                className: "min-w-[320px]",
                render: (job) => (
                  <div className="space-y-2">
                    <p className="font-medium text-slate-900">{job.title ?? job.description}</p>
                    <p className="max-w-xl text-sm leading-6 text-slate-600">{job.description}</p>
                  </div>
                ),
              },
              {
                header: "Feed",
                render: (job) => (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{job.feedName}</p>
                    <p className="text-xs text-slate-500">{formatObjectLabel(job.author)}</p>
                  </div>
                ),
              },
              {
                header: "Term / Status",
                render: (job) => (
                  <div className="space-y-1">
                    <p>{formatJobTerm(formatObjectLabel(job.term))}</p>
                    <p className="text-xs text-slate-500">{formatObjectLabel(job.status)}</p>
                  </div>
                ),
              },
              {
                header: "Updated",
                className: "min-w-[190px]",
                render: (job) => (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{formatRelativeDateTime(job.updatedAt)}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(job.updatedAt)}</p>
                  </div>
                ),
              },
              {
                header: "Detail",
                render: (job) => (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/external-jobs/${job.id}`}>Otevřít</Link>
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
