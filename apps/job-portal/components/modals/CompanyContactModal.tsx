"use client";

import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";
import { TrackedButton } from "@ui/components/core/tracked-button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@ui/components/core/dialog";
import { Mail, Phone } from "lucide-react";
import { getAuthToken, isValidToken } from "../../lib/constants";
import { useTokenRestore } from "../TokenRestoreProvider";
import { useGetProfile } from "../../hooks/useGetProfile";
import { useLoginUrl } from "../../hooks/useLoginUrl";
import type { CompanyContact } from "../../types";

interface CompanyContactModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contacts: CompanyContact[];
}

export const CompanyContactModal = ({
    open,
    onOpenChange,
    contacts,
}: CompanyContactModalProps) => {
    const router = useRouterWithNavigationLoading();
    const { mounted, tokenRestored } = useTokenRestore();
    const token = mounted && tokenRestored ? getAuthToken() : null;
    const hasValidToken = mounted && tokenRestored && !!token && isValidToken(token);
    const { data: userProfile } = useGetProfile(hasValidToken);
    const isLoggedIn = hasValidToken && !!userProfile?.data;
    const loginUrl = useLoginUrl();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-900">
                        Kontakt
                    </DialogTitle>
                </DialogHeader>
                {!isLoggedIn ? (
                    <div className="py-8 text-center">
                        <p className="text-gray-700 mb-4">
                            Pro zobrazení kontaktních informací se musíš nejprve přihlásit nebo se
                            registrovat.
                        </p>
                        <TrackedButton
                            onClick={() => {
                                onOpenChange(false);
                                router.push(loginUrl);
                            }}
                            gaCategory="Company contact modal"
                            gaAction="Přihlásit se"
                            gaLabel="companies"
                        >
                            Přihlásit se
                        </TrackedButton>
                    </div>
                ) : (
                    <div className="space-y-6 py-2">
                        {contacts.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">
                                Žádné kontaktní informace nejsou k dispozici.
                            </p>
                        ) : (
                            contacts.map((contact, index) => (
                                <div
                                    key={contact.id}
                                    className={`pb-6 ${index < contacts.length - 1
                                        ? "border-b border-gray-200"
                                        : ""
                                        }`}
                                >
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        {contact.firstName} {contact.lastName}
                                    </h3>
                                    <div className="space-y-3">
                                        {contact.email && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                                                    <Mail className="h-5 w-5 text-green-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs text-gray-500 mb-1">
                                                        Email
                                                    </div>
                                                    <a
                                                        href={`mailto:${contact.email}`}
                                                        className="text-green-600 hover:text-green-700 font-medium break-all"
                                                    >
                                                        {contact.email}
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        {contact.phone && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                                                    <Phone className="h-5 w-5 text-green-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs text-gray-500 mb-1">
                                                        Telefon
                                                    </div>
                                                    <a
                                                        href={`tel:${contact.phone}`}
                                                        className="text-green-600 hover:text-green-700 font-medium"
                                                    >
                                                        {contact.phone}
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
