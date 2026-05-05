import { ChevronLeft } from "lucide-react";
import { NavigationLink } from "@ui/components/core/navigation-link";

interface BackLinkProps {
    href: string;
    label: string;
    className?: string;
}

export function BackLink({ href, label, className = "" }: BackLinkProps) {
    return (
        <NavigationLink
            href={href}
            className={`inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors ${className}`}
        >
            <ChevronLeft className="h-4 w-4" />
            {label}
        </NavigationLink>
    );
}
