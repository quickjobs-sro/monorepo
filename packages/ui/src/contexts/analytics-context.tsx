"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

export interface GaEventOptions {
  companyId?: string | number;
  companyName?: string;
}

export type GaEventFn = (
  category: string,
  action: string,
  label: string,
  options?: GaEventOptions
) => void;

const noop: GaEventFn = () => { };

const AnalyticsContext = createContext<GaEventFn>(noop);

export function AnalyticsProvider({
  track = noop,
  children,
}: {
  track?: GaEventFn;
  children: ReactNode;
}) {
  const value = useMemo(() => track, [track]);
  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalyticsTrack(): GaEventFn {
  return useContext(AnalyticsContext);
}
