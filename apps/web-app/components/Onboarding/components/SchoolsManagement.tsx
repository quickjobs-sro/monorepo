import { X } from "lucide-react";
import { Button } from "@ui/components/core/button";

interface School {
    id: number;
    school: {
        id: number;
        name: string;
    };
    schoolFaculty?: {
        name: string;
    } | null;
    otherText?: string | null;
    endYear?: number | null;
}

interface SchoolsManagementProps {
    schools: School[] | undefined;
    isLoading: boolean;
    requireSchools?: boolean;
    onAddSchool: () => void;
    onRemoveSchool: (schoolId: number) => void;
    onContinue?: () => void;
    showContinueButton?: boolean;
    continueButtonLabel?: string;
    description?: string;
    emptyStateMessage?: string;
    addButtonLabel?: string;
    note?: string;
}

export const SchoolsManagement = ({
    schools,
    isLoading,
    requireSchools = false,
    onAddSchool,
    onRemoveSchool,
    onContinue,
    showContinueButton = true,
    continueButtonLabel = "Pokračovat",
    description = "Přidej školu, kde studuješ. Můžeš přidat více škol.",
    emptyStateMessage = "Zatím nemáš přidanou žádnou školu.",
    addButtonLabel = "Přidat školu",
    note,
}: SchoolsManagementProps) => {
    const hasSchools = schools && schools.length > 0;

    return (
        <div className="space-y-4">
            {description && (
                <p className="text-sm text-gray-500 text-center">{description}</p>
            )}
            {hasSchools ? (
                <div className="space-y-2">
                    {schools.map((school) => (
                        <div
                            key={school.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                            <div>
                                <p className="font-medium">
                                    {school.school.id === 1465
                                        ? school.otherText
                                        : school.school.name}
                                </p>
                                {school.schoolFaculty && (
                                    <p className="text-sm text-gray-500">
                                        {school.schoolFaculty.name}
                                    </p>
                                )}
                                {school.endYear && (
                                    <p className="text-sm text-gray-500">
                                        Rok ukončení: {school.endYear}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemoveSchool(school.id)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <p>{emptyStateMessage}</p>
                </div>
            )}
            <Button onClick={onAddSchool} variant="outline" className="w-full">
                {addButtonLabel}
            </Button>
            {showContinueButton && onContinue && (
                <Button
                    onClick={onContinue}
                    className="w-full uppercase"
                    disabled={isLoading || (requireSchools && !hasSchools)}
                >
                    {isLoading ? "Načítám..." : continueButtonLabel}
                </Button>
            )}
            {note && (
                <p className="text-xs text-gray-400 text-center">{note}</p>
            )}
        </div>
    );
};


