"use client";

import { useState } from "react";
import Image from "next/image";
import { TrackedAnchor } from "@ui/components/core/tracked-anchor";
import { TrackedButton } from "@ui/components/core/tracked-button";
import { NavigationLink } from "@ui/components/core/navigation-link";
import { ExternalLink } from "lucide-react";
import { CompanyContactModal } from "./modals/CompanyContactModal";
import type { Company, CompanyOffer } from "../types";
import { slugify } from "../lib/slugify";

interface CompanyCardProps {
    company: Company;
    /**
     * "listing" — simplified tile; entire card is a NavigationLink to the detail page.
     *             CTA is a visual-only div (not a button) to avoid nested interactive elements.
     * "detail"  — full layout with contact modal and website links (default).
     */
    variant?: "listing" | "detail";
}

export const CompanyCard = ({ company, variant = "detail" }: CompanyCardProps) => {
    const [showContactModal, setShowContactModal] = useState(false);

    const contacts = company.contacts || [];
    const hasContacts = contacts.length > 0;

    const websites = company.websites
        ? [...company.websites].sort((a, b) => a.sortOrder - b.sortOrder)
        : [];
    const hasWebsites = websites.length > 0;

    const cardInner = (
        <div
            className={`border-2 border-gray-200 rounded-lg p-4 sm:p-6 hover:border-green-500 transition-colors bg-white${variant === "listing" ? " cursor-pointer" : ""
                }`}
        >
            {/* Logo and Name Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 mb-6 md:justify-between">
                {company.logo && (
                    <div className="w-60 h-20 sm:w-80 sm:h-32 relative flex-shrink-0">
                        <Image
                            src={company.logo}
                            alt={`${company.name} logo`}
                            fill
                            className="object-contain"
                            unoptimized
                        />
                    </div>
                )}
                <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-[#002d48]">
                    {company.name}
                </h2>
            </div>

            {/* Row 1: short description full-width; Row 2: offers | audience [1fr_2fr]; Row 3: location | CTA */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 md:gap-8">
                {/* Row 1: Proč se nám ozvat — full width */}
                {company.shortDescription && (
                    <div className="md:col-span-2">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
                            Proč se nám ozvat?
                        </h3>
                        <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                            {company.shortDescription}
                        </p>
                    </div>
                )}

                {/* Row 2 col 1: Nabízíme */}
                <div>
                    {company.companyOffers && company.companyOffers.length > 0 && (
                        <>
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
                                Nabízíme:
                            </h3>
                            <ul className="list-disc list-outside pl-5 space-y-0.5 text-sm sm:text-base text-gray-700">
                                {company.companyOffers.map((offer: CompanyOffer) => (
                                    <li key={offer.id}>
                                        {offer.offerType?.name ||
                                            offer.offerType?.label ||
                                            "Nabídka"}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>

                {/* Row 2 col 2: Které studenty hledáme */}
                <div>
                    {company.studentAudienceNotes && company.studentAudienceNotes.length > 0 && (
                        <>
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
                                Které studenty hledáme:
                            </h3>
                            <ul className="list-disc list-outside pl-5 space-y-1 text-sm sm:text-base text-gray-700">
                                {company.studentAudienceNotes.map((note, i) => (
                                    <li key={i}>{note}</li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>

                {/* Row 3 col 1: Lokace */}
                <div>
                    {company.location && (
                        <div className="text-sm sm:text-base text-gray-600">
                            <span className="font-semibold">Lokace:</span>{" "}
                            <span className="break-words">{company.location}</span>
                        </div>
                    )}
                </div>

                {/* Row 3 col 2: CTA */}
                <div className="flex flex-col">
                    {variant === "listing" ? (
                        <div className="flex justify-end mt-auto">
                            <div
                                aria-hidden="true"
                                className="flex uppercase items-center justify-center w-full rounded-md sm:w-[400px] bg-primary px-5 sm:px-7 py-2.5 sm:py-3.5 text-sm font-medium text-white"
                            >
                                Zobrazit nabídky, kontakty, odkazy,...
                            </div>
                        </div>
                    ) : (
                        (hasWebsites || hasContacts) && (
                            <div className="flex flex-col gap-2 sm:gap-3 mt-auto w-full items-stretch sm:items-end">
                                {hasContacts && (
                                    <TrackedButton
                                        onClick={() => setShowContactModal(true)}
                                        variant="default"
                                        className="w-full sm:w-[320px] px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-md uppercase"
                                        gaCategory="Company"
                                        gaAction="Show contact modal"
                                        gaLabel={company.name}
                                        gaCompanyId={company.id}
                                        gaCompanyName={company.name}
                                    >
                                        Kontakt na HR pro studenty
                                    </TrackedButton>
                                )}
                                {websites.map((website) => (
                                    <TrackedAnchor
                                        key={website.id}
                                        href={website.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full sm:w-[320px] rounded-md border-2 border-green-500 bg-background hover:bg-accent hover:text-accent-foreground text-green-500 uppercase h-11 rounded-md px-8 py-2 text-sm font-medium"
                                        gaCategory="Company"
                                        gaAction="Go to web"
                                        gaLabel={website.url}
                                        gaCompanyId={company.id}
                                        gaCompanyName={company.name}
                                    >
                                        {website.name}
                                        <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </TrackedAnchor>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );

    if (variant === "listing") {
        return (
            <NavigationLink
                href={`/companies/${company.slug ?? slugify(company.name)}`}
                prefetch={false}
                gaCategory="Company"
                gaAction="View detail"
                gaLabel={company.name}
                gaCompanyId={company.id}
                gaCompanyName={company.name}
                className="block"
            >
                {cardInner}
            </NavigationLink>
        );
    }

    return (
        <>
            {cardInner}
            <CompanyContactModal
                open={showContactModal}
                onOpenChange={setShowContactModal}
                contacts={contacts}
            />
        </>
    );
};
