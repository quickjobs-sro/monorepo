"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { appQueryClient } from "../lib/queryClient";

export const AppQueryProvider = ({ children }: { children: ReactNode }) => {
    return <QueryClientProvider client={appQueryClient}>{children}</QueryClientProvider>;
};
