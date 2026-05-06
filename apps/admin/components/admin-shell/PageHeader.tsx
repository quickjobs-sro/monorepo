import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-emerald-950/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">{eyebrow}</p> : null}
        <div className="space-y-1">
          <h1 className="font-[family-name:var(--font-red-hat-display)] text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 md:text-base">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
