const dateTimeFormatter = new Intl.DateTimeFormat("cs-CZ", {
  dateStyle: "medium",
  timeStyle: "short",
});

const compactNumberFormatter = new Intl.NumberFormat("cs-CZ", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const decimalFormatter = new Intl.NumberFormat("cs-CZ", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat("cs-CZ", {
  numeric: "auto",
});

const JOB_TERM_LABELS: Record<string, string> = {
  one_time: "Jednorázově",
  long_term: "Dlouhodobě",
  full_time: "Plný úvazek",
};

function resolveDate(value?: string | Date | null): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value?: string | Date | null): string {
  const date = resolveDate(value);
  if (!date) {
    return "—";
  }

  return dateTimeFormatter.format(date);
}

export function formatCompactNumber(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return compactNumberFormatter.format(value);
}

export function formatDecimal(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return decimalFormatter.format(value);
}

export function formatCurrency(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return currencyFormatter.format(value);
}

export function formatPercent(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return percentFormatter.format(value);
}

export function formatJobTerm(term?: string | null): string {
  if (!term) {
    return "—";
  }

  return JOB_TERM_LABELS[term] ?? term;
}

export function formatRelativeDateTime(value?: string | Date | null): string {
  const date = resolveDate(value);
  if (!date) {
    return "—";
  }

  const differenceInMinutes = Math.round((date.getTime() - Date.now()) / 60_000);
  const absoluteMinutes = Math.abs(differenceInMinutes);

  if (absoluteMinutes < 60) {
    return relativeTimeFormatter.format(differenceInMinutes, "minute");
  }

  const differenceInHours = Math.round(differenceInMinutes / 60);
  if (Math.abs(differenceInHours) < 48) {
    return relativeTimeFormatter.format(differenceInHours, "hour");
  }

  const differenceInDays = Math.round(differenceInHours / 24);
  if (Math.abs(differenceInDays) < 30) {
    return relativeTimeFormatter.format(differenceInDays, "day");
  }

  const differenceInMonths = Math.round(differenceInDays / 30);
  if (Math.abs(differenceInMonths) < 12) {
    return relativeTimeFormatter.format(differenceInMonths, "month");
  }

  const differenceInYears = Math.round(differenceInMonths / 12);
  return relativeTimeFormatter.format(differenceInYears, "year");
}

export function formatName(parts: Array<string | null | undefined>): string {
  const value = parts.map((part) => part?.trim()).filter(Boolean).join(" ");
  return value || "Neznámý uživatel";
}
