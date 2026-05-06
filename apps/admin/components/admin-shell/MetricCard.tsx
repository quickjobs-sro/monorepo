import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@ui/components/core/card";
import { cn } from "@ui/lib/utils";

export function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <Card
      className={cn(
        "border-white/80 bg-white/90 shadow-[0_18px_50px_-26px_rgba(15,23,42,0.35)]",
        tone === "warning" && "border-amber-200 bg-amber-50/90",
        tone === "danger" && "border-rose-200 bg-rose-50/90"
      )}
    >
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
          <p className="font-[family-name:var(--font-red-hat-display)] text-3xl font-bold text-slate-950">{value}</p>
          <p className="text-sm text-slate-600">{hint}</p>
        </div>
        <div className="rounded-2xl bg-emerald-950 p-3 text-white shadow-lg">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
