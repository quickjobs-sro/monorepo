"use client";

import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";
import { TrackedButton } from "@ui/components/core/tracked-button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@ui/components/core/dialog";

interface LocationFilterLoginModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const LocationFilterLoginModal = ({
    open,
    onOpenChange,
}: LocationFilterLoginModalProps) => {
    const router = useRouterWithNavigationLoading();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-900">
                        Filtr lokace
                    </DialogTitle>
                </DialogHeader>
                <div className="py-8 text-center">
                    <p className="text-gray-700 mb-4">
                        Pro filtrování lokace se musíš nejprve přihlásit nebo se
                        registrovat.
                    </p>
                    <TrackedButton
                        onClick={() => {
                            onOpenChange(false);
                            router.push("/login?returnUrl=" + encodeURIComponent("/jobs"));
                        }}
                        gaCategory="Location filter modal"
                        gaAction="Přihlásit se"
                        gaLabel="jobs"
                    >
                        Přihlásit se
                    </TrackedButton>
                </div>
            </DialogContent>
        </Dialog>
    );
};
