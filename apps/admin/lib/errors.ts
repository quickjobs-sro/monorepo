export function getErrorMessage(error: unknown, fallback = "Došlo k chybě při načítání dat."): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return fallback;
}
