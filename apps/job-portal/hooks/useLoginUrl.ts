"use client";

import { usePathname } from "next/navigation";

export function useLoginUrl(): string {
    const pathname = usePathname();
    return `/login?returnUrl=${encodeURIComponent(pathname)}`;
}
