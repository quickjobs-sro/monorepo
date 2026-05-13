import type { ReactNode } from "react";
import { Filter } from "lucide-react";
import { Badge } from "@ui/components/core/badge";
import { Card, CardContent } from "@ui/components/core/card";
import { formatCompactNumber } from "@/lib/formatting";
import { CRITERIA_LABELS } from "./config";

function formatCriteriaValue(value: number | boolean): string {
  if (typeof value === "boolean") {
    return value ? "ano" : "ne";
  }

  return formatCompactNumber(value);
}

export function CriteriaPills({
  criteria,
}: {
  criteria?: Record<string, number | boolean>;
}) {
  const entries = Object.entries(criteria ?? {});
  if (entries.length === 0) {
    return null;
  }

  return (
    <Card className="border-white/80 bg-white/90 shadow-none">
      <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm text-slate-600">
        <Filter className="h-4 w-4 text-emerald-700" />
        <span className="font-medium text-slate-900">Backend kritéria:</span>
        {entries.map(([key, value]) => (
          <Badge key={key} variant="secondary" className="bg-slate-100 text-slate-700">
            {CRITERIA_LABELS[key] ?? key}: {formatCriteriaValue(value)}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}

export function StateCard({
  tone = "default",
  children,
}: {
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <Card className={tone === "danger" ? "border-rose-200 bg-rose-50/80" : undefined}>
      <CardContent className={tone === "danger" ? "p-6 text-sm text-rose-700" : "p-6 text-sm text-slate-500"}>
        {children}
      </CardContent>
    </Card>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-red-hat-display)] text-2xl font-bold text-slate-950">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}
