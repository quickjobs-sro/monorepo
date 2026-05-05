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
  if (to) {
    return `${from} - ${to}`;
  }
  return `${from} / ${item.salaryType}`;
};
