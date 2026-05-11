"use client";

import { FormEvent, useState } from "react";
import { Bell, Clock3, Search, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@ui/components/core/badge";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { Checkbox } from "@ui/components/core/checkbox";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
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
import { formatCompactNumber, formatDateTime, formatJobTerm, formatName } from "@/lib/formatting";
import type { Candidate, JobTerm } from "@/lib/openapi/types";
import { fetchCandidateSearchHistory, fetchCandidateWatchdogs, fetchCandidates, type CandidateSearchQueryParams } from "./api";
import { candidateSearchHistoryQueryKey, candidateWatchdogsQueryKey, candidatesQueryKey } from "./queries";

type CandidateTermFilter = JobTerm | "all";
type CandidateGenderFilter = "all" | "male" | "female";

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumberCsv(value: string): number[] {
  return parseCsv(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hasSearchIntent(params: CandidateSearchQueryParams): boolean {
  return Boolean(
    params.showAll ||
      params.keyword ||
      params.skills?.length ||
      params.jobTerms?.length ||
      params.gender ||
      params.schoolIds?.length ||
      params.schoolFacultyIds?.length ||
      params.age
  );
}

function formatList(values: Array<string | number | null | undefined>, empty = "—"): string {
  const filtered = values
    .map((value) => (value == null ? "" : String(value).trim()))
    .filter(Boolean);

  return filtered.length ? filtered.join(", ") : empty;
}

function CandidateInlineDetail({ candidate }: { candidate: Candidate }) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <summary className="cursor-pointer text-sm font-medium text-slate-900">Inline detail</summary>
      <div className="mt-3 grid gap-4 text-sm leading-6 text-slate-700 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Skills</p>
          <p className="mt-1">{formatList(candidate.skills)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Areas</p>
          <p className="mt-1">{formatList(candidate.areas.map((area) => area.areaName ?? `Area ${area.areaId}`))}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Schools</p>
          <p className="mt-1">{formatList(candidate.schools.map((school) => school.schoolName ?? `School ${school.schoolId}`))}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Experience</p>
          <p className="mt-1">
            {formatList(candidate.experiences.map((experience) => formatList([experience.title, experience.companyName], "")))}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Candidate statuses</p>
          <p className="mt-1">
            {formatList(candidate.candidateStatuses.map((status) => `${status.status} (${formatDateTime(status.createdAt)})`))}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Reviews / images</p>
          <p className="mt-1">
            Reviews: {formatCompactNumber(candidate.reviews.length)}, images: {formatCompactNumber(candidate.images.length)}
          </p>
        </div>
      </div>
    </details>
  );
}

export function CandidatesPage() {
  const [keyword, setKeyword] = useState("");
  const [skills, setSkills] = useState("");
  const [schoolIds, setSchoolIds] = useState("");
  const [facultyIds, setFacultyIds] = useState("");
  const [age, setAge] = useState("");
  const [term, setTerm] = useState<CandidateTermFilter>("all");
  const [gender, setGender] = useState<CandidateGenderFilter>("all");
  const [limit, setLimit] = useState("50");
  const [showAll, setShowAll] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState<CandidateSearchQueryParams | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const candidateQuery = useQuery({
    queryKey: candidatesQueryKey(submittedQuery),
    queryFn: () => fetchCandidates(submittedQuery ?? {}),
    enabled: submittedQuery !== null,
  });
  const historyQuery = useQuery({
    queryKey: candidateSearchHistoryQueryKey,
    queryFn: fetchCandidateSearchHistory,
  });
  const watchdogsQuery = useQuery({
    queryKey: candidateWatchdogsQueryKey,
    queryFn: fetchCandidateWatchdogs,
  });

  function buildQuery(page: number): CandidateSearchQueryParams {
    return {
      keyword: keyword.trim() || undefined,
      skills: parseCsv(skills),
      jobTerms: term === "all" ? undefined : [term],
      gender: gender === "all" ? undefined : gender,
      schoolIds: parseNumberCsv(schoolIds),
      schoolFacultyIds: parseNumberCsv(facultyIds),
      age: parseOptionalNumber(age),
      showAll: showAll || undefined,
      page,
      limit: Number(limit),
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = buildQuery(1);

    if (!hasSearchIntent(nextQuery)) {
      setSubmittedQuery(null);
      setFormMessage("Zadej aspoň jeden filtr nebo zapni Show all. Prázdný default search nespouštíme.");
      return;
    }

    setFormMessage(null);
    setSubmittedQuery(nextQuery);
  }

  function setSubmittedPage(page: number) {
    setSubmittedQuery((current) => (current ? { ...current, page } : current));
  }

  const candidates = candidateQuery.data?.users ?? [];
  const total = candidateQuery.data?.total ?? 0;
  const currentPage = submittedQuery?.page ?? 1;
  const currentLimit = submittedQuery?.limit ?? Number(limit);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage * currentLimit < total;
  const historyItems = historyQuery.data?.items ?? [];
  const watchdogs = watchdogsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Candidates"
        description="Filtrovaný support pohled nad `/v1/candidates`; kandidát detail se rozbaluje z list response bez per-row requestů."
      />

      <Card className="border-white/80 bg-white/90">
        <CardContent className="space-y-4 p-6">
          <form className="grid gap-4 xl:grid-cols-[1.2fr_1fr_auto]" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Keyword" />
              <Input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Skills oddělené čárkou" />
              <Input value={schoolIds} onChange={(event) => setSchoolIds(event.target.value)} placeholder="School IDs, např. 12, 15" />
              <Input value={facultyIds} onChange={(event) => setFacultyIds(event.target.value)} placeholder="Faculty IDs, např. 3, 8" />
              <Input value={age} onChange={(event) => setAge(event.target.value)} placeholder="Věk" type="number" min={15} max={99} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Select value={term} onValueChange={(value) => setTerm(value as CandidateTermFilter)}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Typ práce" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bez term filtru</SelectItem>
                  <SelectItem value="one_time">Jednorázově</SelectItem>
                  <SelectItem value="long_term">Dlouhodobě</SelectItem>
                  <SelectItem value="full_time">Plný úvazek</SelectItem>
                </SelectContent>
              </Select>
              <Select value={gender} onValueChange={(value) => setGender(value as CandidateGenderFilter)}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bez gender filtru</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                </SelectContent>
              </Select>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 / stránka</SelectItem>
                  <SelectItem value="50">50 / stránka</SelectItem>
                  <SelectItem value="100">100 / stránka</SelectItem>
                  <SelectItem value="200">200 / stránka</SelectItem>
                </SelectContent>
              </Select>
              <Label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                <Checkbox checked={showAll} onCheckedChange={(checked) => setShowAll(checked === true)} />
                <span>Show all</span>
              </Label>
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit">
                <Search className="mr-2 h-4 w-4" />
                Hledat
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSubmittedQuery(null);
                  setFormMessage(null);
                }}
              >
                Reset výsledků
              </Button>
            </div>
          </form>

          {formMessage ? <p className="text-sm font-medium text-amber-800">{formMessage}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Loaded Candidates"
          value={candidateQuery.isFetching ? "…" : formatCompactNumber(candidates.length)}
          hint={submittedQuery ? `Stránka ${currentPage}, limit ${currentLimit}` : "Search zatím nebyl spuštěn."}
          icon={Users}
        />
        <MetricCard
          title="Total"
          value={submittedQuery ? formatCompactNumber(total) : "—"}
          hint="Total vrácený candidate endpointem."
          icon={Search}
        />
        <MetricCard
          title="Watchdogs"
          value={watchdogsQuery.isLoading ? "…" : formatCompactNumber(watchdogs.length)}
          hint={`${watchdogs.filter((watchdog) => watchdog.isActive).length} aktivních watchdogů.`}
          icon={Bell}
        />
        <MetricCard
          title="Search History"
          value={historyQuery.isLoading ? "…" : formatCompactNumber(historyItems.length)}
          hint="Poslední uložené candidate search dotazy."
          icon={Clock3}
        />
      </div>

      {submittedQuery === null ? (
        <Card className="border-dashed border-slate-300/80 bg-white/70">
          <CardContent className="p-6 text-sm leading-6 text-slate-600">
            Candidate endpoint obsahuje PII a může být těžký. Proto admin nespouští broad search při otevření stránky;
            použij filtr nebo explicitní Show all.
          </CardContent>
        </Card>
      ) : candidateQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">Načítám kandidáty...</CardContent>
        </Card>
      ) : candidateQuery.isError ? (
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-6 text-sm text-rose-700">{getErrorMessage(candidateQuery.error)}</CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-white/80 bg-white/90">
            <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-slate-600">
              <span>Načteno: {candidates.length}</span>
              <span>Total: {total}</span>
              <span>Page: {currentPage}</span>
              <Button variant="outline" size="sm" disabled={!canGoPrevious} onClick={() => setSubmittedPage(currentPage - 1)}>
                Předchozí
              </Button>
              <Button variant="outline" size="sm" disabled={!canGoNext} onClick={() => setSubmittedPage(currentPage + 1)}>
                Další
              </Button>
            </CardContent>
          </Card>

          <DataTable
            data={candidates}
            keyExtractor={(candidate) => String(candidate.id)}
            emptyMessage="Candidate search nevrátil žádné kandidáty."
            columns={[
              {
                header: "Kandidát",
                className: "min-w-[260px]",
                render: (candidate) => (
                  <div className="space-y-2">
                    <p className="font-medium text-slate-900">{formatName([candidate.name, candidate.surname])}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ID {candidate.id}</p>
                    <p className="text-sm text-slate-600">{candidate.description ?? "Bez popisu"}</p>
                  </div>
                ),
              },
              {
                header: "Kontakt",
                render: (candidate) => (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{candidate.email ?? "Bez e-mailu"}</p>
                    <p className="text-sm text-slate-600">{candidate.phone ?? "Bez telefonu"}</p>
                    <p className="text-xs text-slate-500">Gender: {candidate.gender ?? "—"}</p>
                  </div>
                ),
              },
              {
                header: "Skóre",
                render: (candidate) => (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{candidate.rating ?? "—"}</p>
                    <p className="text-xs text-slate-500">{candidate.ratingCount ?? 0} hodnocení</p>
                  </div>
                ),
              },
              {
                header: "Vytvořeno",
                render: (candidate) => <span>{formatDateTime(candidate.createdAt)}</span>,
              },
              {
                header: "Detail",
                className: "min-w-[420px]",
                render: (candidate) => <CandidateInlineDetail candidate={candidate} />,
              },
            ]}
          />
        </>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Search History</p>
              <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                Poslední dotazy
              </h2>
            </div>
            {historyQuery.isLoading ? (
              <p className="text-sm text-slate-500">Načítám historii...</p>
            ) : historyQuery.isError ? (
              <p className="text-sm text-rose-700">{getErrorMessage(historyQuery.error)}</p>
            ) : historyItems.length === 0 ? (
              <p className="text-sm text-slate-500">Historie vyhledávání je prázdná.</p>
            ) : (
              <div className="space-y-3">
                {historyItems.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-white text-slate-800">{formatDateTime(item.createdAt)}</Badge>
                      {item.jobTerms.map((jobTerm) => (
                        <Badge key={jobTerm} className="bg-emerald-100 text-emerald-900">
                          {formatJobTerm(jobTerm)}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-3 font-medium text-slate-900">{item.keyword ?? "Bez keyword"}</p>
                    <p className="mt-1 text-sm text-slate-600">Skills: {formatList(item.skills)}</p>
                    <p className="text-sm text-slate-600">Watchdogs: {item.watchdogs.length}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Watchdogs</p>
              <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
                Read-only watchdog audit
              </h2>
            </div>
            {watchdogsQuery.isLoading ? (
              <p className="text-sm text-slate-500">Načítám watchdogy...</p>
            ) : watchdogsQuery.isError ? (
              <p className="text-sm text-rose-700">{getErrorMessage(watchdogsQuery.error)}</p>
            ) : watchdogs.length === 0 ? (
              <p className="text-sm text-slate-500">Žádné watchdogy nejsou evidované.</p>
            ) : (
              <div className="space-y-3">
                {watchdogs.slice(0, 8).map((watchdog) => (
                  <div key={watchdog.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900">Search #{watchdog.candidateSearchId}</p>
                        <p className="text-sm text-slate-600">{watchdog.customEmail ?? "Bez custom emailu"}</p>
                      </div>
                      <Badge className={watchdog.isActive ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}>
                        {watchdog.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <span>Frequency: {watchdog.frequencyInDays} d</span>
                      <span>Next run: {formatDateTime(watchdog.nextRunAt)}</span>
                      <span>Last sent: {formatDateTime(watchdog.lastSentAt)}</span>
                      <span>Updated: {formatDateTime(watchdog.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
