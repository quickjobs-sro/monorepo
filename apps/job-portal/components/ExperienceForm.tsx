"use client";

import { useState } from "react";
import { Button } from "@ui/components/core/button";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import { X, Plus, Edit2 } from "lucide-react";
import { cn } from "@ui/lib/utils";
import type { Experience } from "../types";

interface ExperienceFormProps {
    experiences: Experience[];
    onChange: (experiences: Experience[]) => void;
    disabled?: boolean;
    className?: string;
}

// Re-export for backward compatibility
export type { Experience };

export const ExperienceForm = ({ experiences, onChange, disabled, className }: ExperienceFormProps) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [newExperience, setNewExperience] = useState<Experience>({
        title: "",
        companyName: "",
    });

    const handleAddExperience = () => {
        if (newExperience.title.trim() && newExperience.companyName.trim()) {
            if (editingIndex !== null) {
                // Update existing experience
                const updated = [...experiences];
                updated[editingIndex] = { ...newExperience };
                onChange(updated);
                setEditingIndex(null);
            } else {
                // Add new experience
                onChange([...experiences, { ...newExperience }]);
            }
            setNewExperience({ title: "", companyName: "" });
            setIsAdding(false);
        }
    };

    const handleEditExperience = (index: number) => {
        const exp = experiences[index];
        if (!exp) return;
        setNewExperience({ title: exp.title, companyName: exp.companyName });
        setEditingIndex(index);
        setIsAdding(true);
    };

    const handleRemoveExperience = (index: number) => {
        onChange(experiences.filter((_, i) => i !== index));
    };

    const handleCancel = () => {
        setNewExperience({ title: "", companyName: "" });
        setIsAdding(false);
        setEditingIndex(null);
    };

    return (
        <div className={cn("space-y-4", className)}>
            {!isAdding ? (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAdding(true)}
                    disabled={disabled}
                    className="w-full"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Přidat zkušenost
                </Button>
            ) : (
                <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                    <div>
                        <Label htmlFor="experience-title">Pozice / Název</Label>
                        <Input
                            id="experience-title"
                            value={newExperience.title}
                            onChange={(e) =>
                                setNewExperience({ ...newExperience, title: e.target.value })
                            }
                            placeholder="Např. Asistent prodeje"
                            maxLength={255}
                        />
                    </div>
                    <div>
                        <Label htmlFor="experience-company">Firma / Místo</Label>
                        <Input
                            id="experience-company"
                            value={newExperience.companyName}
                            onChange={(e) =>
                                setNewExperience({ ...newExperience, companyName: e.target.value })
                            }
                            placeholder="Např. Superzoo"
                            maxLength={255}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            onClick={handleAddExperience}
                            disabled={disabled || !newExperience.title.trim() || !newExperience.companyName.trim()}
                            className="flex-1"
                        >
                            {editingIndex !== null ? "Uložit" : "Přidat"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            className="flex-1"
                        >
                            Zrušit
                        </Button>
                    </div>
                </div>
            )}

            {experiences.length > 0 && (
                <div className="space-y-2">
                    <Label>Zkušenosti ({experiences.length})</Label>
                    <div className="space-y-2">
                        {experiences.map((exp, index) => (
                            <div
                                key={index}
                                className="flex items-start justify-between p-3 bg-white rounded-lg border shadow-sm"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{exp.title}</p>
                                    <p className="text-sm text-gray-500">{exp.companyName}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                    <button
                                        type="button"
                                        onClick={() => handleEditExperience(index)}
                                        disabled={disabled}
                                        className="text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-40"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveExperience(index)}
                                        disabled={disabled}
                                        className="text-gray-500 hover:text-red-500 transition-colors disabled:opacity-40"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {experiences.length === 0 && !isAdding && (
                <p className="text-sm text-gray-500 text-center py-4">
                    Zatím nemáš přidané žádné zkušenosti
                </p>
            )}
        </div>
    );
};
