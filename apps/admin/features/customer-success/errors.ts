import { getErrorMessage } from "@/lib/errors";

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const status = "status" in error ? error.status : undefined;
  if (typeof status === "number") {
    return status;
  }

  const response = "response" in error ? error.response : undefined;
  if (!response || typeof response !== "object") {
    return undefined;
  }

  const responseStatus = "status" in response ? response.status : undefined;
  return typeof responseStatus === "number" ? responseStatus : undefined;
}

export function getCustomerSuccessErrorMessage(error: unknown): string {
  const status = getErrorStatus(error);

  if (status === 401) {
    return "Relace vypršela nebo není platná. Přihlas se prosím znovu.";
  }

  if (status === 403) {
    return "Tento Customer Success report je dostupný jen pro root admin účet.";
  }

  return getErrorMessage(error);
}
