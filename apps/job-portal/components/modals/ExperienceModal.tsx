"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import API from "../../lib/legacyApi";
import { Loader2, Check } from "lucide-react";
import isEqual from "fast-deep-equal";

import { useToast } from "@ui/hooks/use-toast";
import { API_KEYS } from "@ui/types/api_keys";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@ui/components/core/dialog";
import { ExperienceForm } from "../ExperienceForm";
import type { Experience } from "../../types";

interface ExperienceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialExperiences: Experience[];
    onSuccess?: () => void;
}

export const ExperienceModal = ({
    open,
    onOpenChange,
    initialExperiences,
    onSuccess,
}: ExperienceModalProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [experiences, setExperiences] = useState<Experience[]>(initialExperiences);
    const [isLoading, setIsLoading] = useState(false);

    const prevOpenRef = useRef(open);

    useEffect(() => {
        const wasJustOpened = open && !prevOpenRef.current;
        prevOpenRef.current = open;

        if (wasJustOpened) {
            setExperiences(initialExperiences);
        }
    }, [open, initialExperiences]);

    const saveExperiences = async (exps: Experience[]) => {
        setIsLoading(true);
        try {
            await API.users.updateProfile({ experience: exps });
            await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            toast({
                title: "Úspěch",
                description: "Zkušenosti byly úspěšně uloženy.",
            });
            onSuccess?.();
        } catch (error) {
            console.error("Error saving experience:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se uložit zkušenosti. Zkus to prosím znovu.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90dvh] overflow-hidden p-0 flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-semibold">Zkušenosti</DialogTitle>
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                    <div className="mb-4">
                        <p className="text-sm text-gray-500">
                            Přidej své pracovní zkušenosti, aby tě zaměstnavatelé lépe poznali.
                        </p>
                    </div>
                    <ExperienceForm
                        experiences={experiences}
                        disabled={isLoading}
                        onChange={(exps) => {
                            setExperiences(exps);
                            saveExperiences(exps);
                        }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};
