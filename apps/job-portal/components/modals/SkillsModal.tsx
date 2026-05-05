"use client";

import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import API from "../../lib/legacyApi";
import { Loader2, Check } from "lucide-react";

import { useToast } from "@ui/hooks/use-toast";
import { API_KEYS } from "@ui/types/api_keys";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@ui/components/core/dialog";
import { Button } from "@ui/components/core/button";
import { SkillsForm } from "../SkillsForm";

interface SkillsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialSkills: string[];
    onSuccess?: () => void;
}

export const SkillsModal = ({
    open,
    onOpenChange,
    initialSkills,
    onSuccess,
}: SkillsModalProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [skills, setSkills] = useState<string[]>(initialSkills);
    const [initialSnapshot, setInitialSnapshot] = useState<string[]>(initialSkills);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setSkills(initialSkills);
            setInitialSnapshot(initialSkills);
        }
    }, [open, initialSkills]);

    const isDirty = useMemo(() => {
        const normalize = (arr: string[]) => arr.map((s) => s.trim());
        return JSON.stringify(normalize(skills)) !== JSON.stringify(normalize(initialSnapshot));
    }, [skills, initialSnapshot]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await API.users.updateProfile({ skills });
            await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            toast({
                title: "Úspěch",
                description: "Dovednosti byly úspěšně uloženy.",
            });
            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving skills:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se uložit dovednosti. Zkus to prosím znovu.",
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
                        <DialogTitle className="text-xl font-semibold">Dovednosti</DialogTitle>
                    </div>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                    <SkillsForm skills={skills} onChange={setSkills} />
                </div>
                <div className="px-6 py-4 border-t flex items-center justify-end">
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!isDirty || isLoading}
                        className="h-11 w-11 p-0"
                        aria-label="Uložit"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Check className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
