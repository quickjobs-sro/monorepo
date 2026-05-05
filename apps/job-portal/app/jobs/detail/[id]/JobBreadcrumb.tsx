"use client";

import { useSearchParams } from "next/navigation";
import { BackLink } from "../../../../components/BackLink";
import { BreadcrumbNav } from "../../../../components/BreadcrumbNav";

interface JobBreadcrumbProps {
    title: string;
    jobTypeLabel: string;
    jobTerm: string;
}

export function JobBreadcrumb({ title, jobTypeLabel, jobTerm }: JobBreadcrumbProps) {
    const searchParams = useSearchParams();
    const fromCompany = searchParams.get("fromCompany") ?? undefined;
    const fromCompanyName = searchParams.get("fromCompanyName") ?? undefined;

    return (
        <>
            {fromCompany && (
                <BackLink
                    href={`/companies/${fromCompany}`}
                    label={`Zpět na ${fromCompanyName ? fromCompanyName.slice(0, 60) : "firmu"}`}
                    className="mb-4"
                />
            )}
            <BreadcrumbNav
                className="mb-4"
                items={fromCompany ? [
                    { label: "Domů", href: "/jobs" },
                    { label: "Firmy", href: "/companies" },
                    { label: fromCompanyName || "Firma", href: `/companies/${fromCompany}` },
                    { label: title },
                ] : [
                    { label: "Domů", href: "/jobs" },
                    { label: jobTypeLabel, href: `/jobs?term=${jobTerm}` },
                    { label: title },
                ]}
            />
        </>
    );
}
