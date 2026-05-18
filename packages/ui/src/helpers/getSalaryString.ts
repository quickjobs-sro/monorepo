import { Job } from "quickjobs-api-wrapper";

export const getSalaryString = (item: Partial<Job>) => {
  if (!item.salary || !item.salaryType) {
    return null;
  }
  const from = item.salary.toLocaleString("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  });
  const to = item.salaryTo
    ? item.salaryTo.toLocaleString("cs-CZ", {
        style: "currency",
        currency: "CZK",
        maximumFractionDigits: 0,
      })
    : null;
  const salaryTypeLabel: Record<string, string> = {
    hour: "hod",
    month: "Měsíc",
    total: "za práci",
  };
  const typeLabel = salaryTypeLabel[item.salaryType] ?? item.salaryType;
  if (to) {
    return `${from} - ${to}/${typeLabel}`;
  }
  return `${from}/${typeLabel}`;
};
