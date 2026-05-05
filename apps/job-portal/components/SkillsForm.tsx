"use client";

import { useMemo, useState } from "react";
import { Button } from "@ui/components/core/button";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import { X, Plus } from "lucide-react";
import { cn } from "@ui/lib/utils";

const predefinedSkillTagKeys = [
    "skill_high_school_study",
    "skill_high_school_diploma",
    "skill_college_study",
    "skill_college_diploma",
    "skill_english",
    "skill_english_advanced",
    "skill_german",
    "skill_german_advanced",
    "skill_ms_office",
    "skill_driving_license",
    "skill_communicative",
    "skill_reliable",
    "skill_appreciative",
    "skill_work_in_team",
    "skill_have_bussines_license",
] as const;

const predefinedSkillTagLabels: Record<(typeof predefinedSkillTagKeys)[number], string> = {
    skill_english_advanced: "Angličtina - Pokročilá",
    skill_english: "Angličtina - Základy",
    skill_german: "Němčina - Základy",
    skill_german_advanced: "Němčina - Pokročilá",
    skill_ms_office: "Znalost MS office",
    skill_high_school_study: "Studuji SŠ",
    skill_high_school_diploma: "Absolvent SŠ",
    skill_college_diploma: "Absolvent VŠ",
    skill_college_study: "Studuji VŠ",
    skill_driving_license: "Řidičský průkaz sk. B",
    skill_communicative: "Komunikativní",
    skill_reliable: "Spolehlivý/á",
    skill_appreciative: "Učenlivý/á",
    skill_work_in_team: "Rád/a pracuji v týmu",
    skill_have_bussines_license: "Mám živnostenský list",
};

export interface SkillsFormProps {
    skills: string[];
    onChange: (skills: string[]) => void;
    className?: string;
}

export const SkillsForm = ({ skills, onChange, className }: SkillsFormProps) => {
    const [newSkill, setNewSkill] = useState("");

    const recommendedSkillLabels = useMemo(() => {
        return predefinedSkillTagKeys.map((key) => predefinedSkillTagLabels[key]);
    }, []);

    const availableRecommendedSkillLabels = useMemo(() => {
        return recommendedSkillLabels.filter((label) => !skills.includes(label));
    }, [recommendedSkillLabels, skills]);

    const handleAddSkill = () => {
        const trimmed = newSkill.trim();
        if (trimmed && !skills.includes(trimmed)) {
            onChange([...skills, trimmed]);
            setNewSkill("");
        }
    };

    const handleAddRecommendedSkill = (label: string) => {
        if (!skills.includes(label)) {
            onChange([...skills, label]);
        }
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        onChange(skills.filter((skill) => skill !== skillToRemove));
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddSkill();
        }
    };

    return (
        <div className={cn("space-y-4", className)}>
            <div>
                <Label htmlFor="new-skill">Přidat dovednost</Label>
                <div className="flex w-full gap-2">
                    <div className="flex-1">
                        <Input
                            id="new-skill"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Např. Řidičský průkaz sk. B"
                            className="w-full"
                        />
                    </div>
                    <Button
                        type="button"
                        onClick={handleAddSkill}
                        disabled={!newSkill.trim() || skills.includes(newSkill.trim())}
                        size="icon"
                        className="shrink-0"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Dovednosti potvrď enterem nebo klikni na +
                </p>
            </div>

            {availableRecommendedSkillLabels.length > 0 && (
                <div className="space-y-2">
                    <Label>Doporučené dovednosti</Label>
                    <div className="flex flex-wrap gap-2">
                        {availableRecommendedSkillLabels.map((label) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => handleAddRecommendedSkill(label)}
                                className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-sm text-gray-700 hover:border-green-500 hover:text-green-700 transition-colors"
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {skills.length > 0 && (
                <div className="space-y-2">
                    <Label>Dovednosti ({skills.length})</Label>
                    <div className="flex flex-wrap gap-2">
                        {skills.map((skill, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5"
                            >
                                <span className="text-sm">{skill}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveSkill(skill)}
                                    className="text-gray-500 hover:text-red-500 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {skills.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                    Zatím nemáš přidané žádné dovednosti
                </p>
            )}
        </div>
    );
};
