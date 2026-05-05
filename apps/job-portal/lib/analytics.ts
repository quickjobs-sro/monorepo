const GA_TRACKING_ID = "G-MW0L06QPPL";

let currentUserId: string | null = null;

declare global {
  interface Window {
    gtag?: (
      command: "config" | "event",
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
  }
}

export function logPageView(): void {
  if (typeof window === "undefined" || !GA_TRACKING_ID || !window.gtag) return;
  const path = window.location.pathname + window.location.search;
  const config: Record<string, unknown> = { page_path: path };
  if (currentUserId) config.user_id = currentUserId;
  window.gtag("config", GA_TRACKING_ID, config);
}

export function initUserId(profileId: string | null): void {
  if (typeof window === "undefined") return; // avoid persisting on server (cross-request leak)
  currentUserId = profileId;
  if (!GA_TRACKING_ID || !window.gtag) return;
  if (!profileId) return;
  window.gtag("config", GA_TRACKING_ID, { user_id: profileId });
}

export interface GaEventOptions {
  companyId?: string | number;
  companyName?: string;
}

export function eventGA(
  category: string,
  action: string,
  label: string,
  options?: GaEventOptions
): void {
  if (typeof window === "undefined" || !GA_TRACKING_ID || !window.gtag) return;
  const params: Record<string, unknown> = {
    event_category: category,
    event_label: label,
  };
  if (currentUserId) params.user_id = currentUserId;
  if (options?.companyId != null || (options?.companyName != null && options.companyName !== "")) {
    const id = options.companyId != null ? String(options.companyId) : "";
    const name = options.companyName ?? "";
    params.company = name ? `${name} (${id})` : id; // jeden parametr pro GA: "Škoda (5)" → jedna custom dimension
  }
  window.gtag("event", action, params);
}

export { GA_TRACKING_ID };
