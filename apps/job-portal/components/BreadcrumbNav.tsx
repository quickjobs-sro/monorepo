import React from "react";
import { NavigationLink } from "@ui/components/core/navigation-link";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbNavProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function BreadcrumbNav({ items, className = "" }: BreadcrumbNavProps) {
    return (
        <nav aria-label="Breadcrumb" className={className}>
            <ol className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 flex-nowrap overflow-x-auto">
                {items.map((item, index) => (
                    <React.Fragment key={index}>
                        <li
                            className={index < items.length - 1 ? "whitespace-nowrap shrink-0" : "text-gray-900 font-medium min-w-0 max-w-[200px] sm:max-w-none shrink truncate"}
                            aria-current={index === items.length - 1 ? "page" : undefined}
                        >
                            {item.href ? (
                                <NavigationLink href={item.href} className="hover:text-gray-900 transition-colors">
                                    {item.label}
                                </NavigationLink>
                            ) : (
                                item.label
                            )}
                        </li>
                        {index < items.length - 1 && (
                            <li className="whitespace-nowrap shrink-0">
                                <span aria-hidden="true">/</span>
                            </li>
                        )}
                    </React.Fragment>
                ))}
            </ol>
        </nav>
    );
}
