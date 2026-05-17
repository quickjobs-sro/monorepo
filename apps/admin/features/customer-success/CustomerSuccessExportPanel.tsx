"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ClipboardCopy, Download, FileJson } from "lucide-react";
import { Badge } from "@ui/components/core/badge";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import { Textarea } from "@ui/components/core/textarea";
import { useToast } from "@ui/hooks/use-toast";
import { formatCompactNumber, formatDateTime } from "@/lib/formatting";
import { fetchCustomerSuccessClaudeExport } from "./api";
import { CRITERIA_LABELS } from "./config";
import { getCustomerSuccessErrorMessage } from "./errors";
import { buildCustomerSuccessExportRequest } from "./params";
import type { CompanyAnalyticsQuery, JobAnalyticsQuery } from "./types";

const DEFAULT_EXPORT_LIMIT = "100";

function parseLimitDraft(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatCriteriaValue(value: string | number | boolean): string {
  if (typeof value === "boolean") {
    return value ? "ano" : "ne";
  }

  if (typeof value === "number") {
    return formatCompactNumber(value);
  }

  return value;
}

function getExportFileName(generatedAt: string): string {
  const date = new Date(generatedAt);
  const day = Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);

  return `customer-success-claude-export-${day}.json`;
}

export function CustomerSuccessExportPanel({
  companyParams,
  jobParams,
}: {
  companyParams: CompanyAnalyticsQuery;
  jobParams: JobAnalyticsQuery;
}) {
  const { toast } = useToast();
  const [companyLimit, setCompanyLimit] = useState(DEFAULT_EXPORT_LIMIT);
  const [jobLimit, setJobLimit] = useState(DEFAULT_EXPORT_LIMIT);

  const exportParams = useMemo(
    () => ({
      company: companyParams,
      job: jobParams,
      companyLimit: parseLimitDraft(companyLimit),
      jobLimit: parseLimitDraft(jobLimit),
      format: "json" as const,
    }),
    [companyLimit, companyParams, jobLimit, jobParams]
  );

  const requestPreview = useMemo(
    () => buildCustomerSuccessExportRequest(exportParams),
    [exportParams]
  );

  const {
    data: exportData,
    error: exportError,
    isError: isExportError,
    isPending: isExportPending,
    mutate: generateExport,
    variables: exportVariables,
  } = useMutation({
    mutationFn: fetchCustomerSuccessClaudeExport,
  });

  const isCurrentExport = exportVariables === exportParams;
  const currentExportData = isCurrentExport ? exportData : undefined;
  const currentExportError = isCurrentExport ? exportError : null;

  const exportJson = useMemo(
    () =>
      currentExportData
        ? JSON.stringify(currentExportData, null, 2)
        : "",
    [currentExportData]
  );

  const activeCriteria = Object.entries(requestPreview.query).filter(
    ([key]) => key !== "format"
  );

  async function handleCopy() {
    if (!exportJson) {
      return;
    }

    if (!navigator.clipboard) {
      toast({
        title: "Kopírování není dostupné",
        description: "Prohlížeč neposkytuje clipboard API.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(exportJson);
      toast({
        title: "JSON zkopírován",
        description: "Export je připravený pro Claude.",
      });
    } catch (error) {
      toast({
        title: "Kopírování selhalo",
        description: getCustomerSuccessErrorMessage(error),
        variant: "destructive",
      });
    }
  }

  function handleDownload() {
    if (!exportJson || !currentExportData) {
      return;
    }

    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = getExportFileName(currentExportData.generatedAt);
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
          Claude export
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
          JSON pro Customer Success analýzu
        </h2>
      </div>

      <Card className="border-white/80 bg-white/90">
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-3 md:grid-cols-[repeat(2,minmax(160px,220px))_auto] md:items-end">
            <Label className="space-y-2">
              <span>Limit firem</span>
              <Input
                max={1000}
                min={1}
                type="number"
                value={companyLimit}
                onChange={(event) => setCompanyLimit(event.target.value)}
              />
            </Label>
            <Label className="space-y-2">
              <span>Limit jobů</span>
              <Input
                max={1000}
                min={1}
                type="number"
                value={jobLimit}
                onChange={(event) => setJobLimit(event.target.value)}
              />
            </Label>
            <Button
              type="button"
              disabled={isExportPending}
              onClick={() => generateExport(exportParams)}
            >
              <FileJson className="h-4 w-4" />
              {isExportPending ? "Generuji..." : "Vygenerovat JSON"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="font-medium text-slate-900">Aktivní export parametry:</span>
            {activeCriteria.map(([key, value]) => (
              <Badge
                key={key}
                variant="secondary"
                className="bg-slate-100 text-slate-700"
              >
                {CRITERIA_LABELS[key] ?? key}: {formatCriteriaValue(value)}
              </Badge>
            ))}
          </div>

          {isExportError && isCurrentExport ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {getCustomerSuccessErrorMessage(currentExportError)}
            </div>
          ) : null}

          {currentExportData ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span>
                  Vygenerováno: {formatDateTime(currentExportData.generatedAt)}
                </span>
                <span>
                  Firmy: {formatCompactNumber(currentExportData.companies.length)}
                </span>
                <span>
                  Joby: {formatCompactNumber(currentExportData.jobs.length)}
                </span>
                <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
                  <ClipboardCopy className="h-4 w-4" />
                  Kopírovat
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                  Stáhnout
                </Button>
              </div>
              <Textarea
                readOnly
                value={exportJson}
                className="min-h-[260px] font-mono text-xs leading-5"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
