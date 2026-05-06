/* eslint-disable no-unused-vars */
import type { ReactNode } from "react";
import { Card, CardContent } from "@ui/components/core/card";

type DataTableColumn<T> = {
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = "Pro tenhle pohled teď nemáme žádná data.",
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return (
      <Card className="border-dashed border-slate-300/80 bg-white/70">
        <CardContent className="p-6 text-sm text-slate-500">{emptyMessage}</CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_18px_50px_-26px_rgba(15,23,42,0.35)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50/80">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr key={keyExtractor(row)} className="align-top transition-colors hover:bg-emerald-50/40">
                {columns.map((column) => (
                  <td key={column.header} className={`px-4 py-4 text-sm text-slate-700 ${column.className ?? ""}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
