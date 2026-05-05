"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { useToast } from "@ui/hooks/use-toast";
import { getSchoolStatusString } from "@ui/helpers/getSchoolStatusString";
import { Button } from "@ui/components/core/button";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@ui/components/core/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@ui/components/core/select";
import {
    fetchFaculties,
    fetchSchools,
    type FacultyLookup,
    type SchoolLookup,
} from "../../lib/migratedQueries";
import API from "../../lib/legacyApi";
import { useGetProfile } from "../../hooks/useGetProfile";

interface SchoolModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const SCHOOL_STATUS_OPTIONS = [
    { value: "in_progress_1", label: "1. ročník" },
    { value: "in_progress_2", label: "2. ročník" },
    { value: "in_progress_3", label: "3. ročník" },
    { value: "in_progress_4", label: "4. ročník" },
    { value: "in_progress_5", label: "5. ročník" },
    { value: "completed", label: "Absolvent" },
] as const;

const OTHER_SCHOOL_ID = 1465;

type SchoolOption = SchoolLookup & {
    faculties?: FacultyLookup[];
};

const SchoolStatusSelect = ({
    id,
    value,
    onValueChange,
    className,
}: {
    id: string;
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
}) => (
    <Select value={value || undefined} onValueChange={onValueChange}>
        <SelectTrigger id={id} className={className}>
            <SelectValue placeholder="Vyber ročník" />
        </SelectTrigger>
        <SelectContent>
            {SCHOOL_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                    {option.label}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

export const SchoolModal = ({ open, onOpenChange, onSuccess }: SchoolModalProps) => {
    const { toast } = useToast();
    const { data: userProfile, isLoading: isProfileLoading, isError: isProfileError, refetch: refetchProfile } = useGetProfile(open);
    const [schoolSearchQuery, setSchoolSearchQuery] = useState("");

    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [isSearchingSchools, setIsSearchingSchools] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
    const [selectedFaculty, setSelectedFaculty] = useState<FacultyLookup | null>(null);
    const [schoolStatus, setSchoolStatus] = useState<string>("");
    const [otherSchoolText, setOtherSchoolText] = useState<string>("");
    const [showOtherSchoolOption, setShowOtherSchoolOption] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [removingSchoolIds, setRemovingSchoolIds] = useState<Record<number, boolean>>({});

    // Filter schools function matching native implementation
    const filterSchools = (schools: SchoolOption[] | undefined, schoolName: string): SchoolOption[] => {
        if (!schools) return [];

        const normalize = (text: string) =>
            text
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();

        const searchWords = normalize(schoolName)
            .split(/\s+/)
            .filter((w) => w.length > 0);

        if (searchWords.length === 0) return [];

        return schools.filter((school) => {
            const fullText = normalize(
                `${school.name} (${school.city || ""})`
            ).replaceAll(" ", "");
            return searchWords.every((word) => fullText.includes(word));
        });
    };

    const searchSchools = async (query: string) => {
        if (!query || query.length < 2) {
            setSchools([]);
            return;
        }

        setIsSearchingSchools(true);
        try {
            // Use type 3 like native app
            const response = await fetchSchools({ type: 3 })
                .catch(() => ({ schools: [] }));
            const allSchools = response.schools || [];

            // Filter using the same logic as native
            const filtered = filterSchools(allSchools, query);
            setSchools(filtered);
        } catch (error) {
            console.error("Error searching schools:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se načíst školy. Zkus to prosím znovu.",
                variant: "destructive",
            });
        } finally {
            setIsSearchingSchools(false);
        }
    };

    const handleSchoolSelect = async (school: SchoolOption) => {
        setSelectedFaculty(null);
        setSchoolStatus("");

        const schoolId = Number(school.id);
        if (!Number.isInteger(schoolId) || schoolId <= 0) {
            setSelectedSchool({
                ...school,
                faculties: [],
            });
            return;
        }

        // Load faculties for the selected school
        try {
            const facultiesResponse = await fetchFaculties({
                schoolId,
            });
            setSelectedSchool({
                ...school,
                faculties: facultiesResponse.faculties || [],
            });
        } catch (error) {
            console.error("Error loading faculties:", error);
            // Set school without faculties if API call fails
            setSelectedSchool({
                ...school,
                faculties: [],
            });
        }
    };

    const handleAddSchool = async () => {
        if (!selectedSchool) {
            toast({
                title: "Chyba",
                description: "Vyber prosím školu.",
                variant: "destructive",
            });
            return;
        }

        if (!schoolStatus) {
            toast({
                title: "Chyba",
                description: "Vyber prosím ročník.",
                variant: "destructive",
            });
            return;
        }

        // Faculty is required if school has faculties
        if (
            selectedSchool.faculties &&
            selectedSchool.faculties.length > 0 &&
            !selectedFaculty
        ) {
            toast({
                title: "Chyba",
                description: "Vyber prosím fakultu.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const schoolData: any = {
                school_id: selectedSchool.id,
                status: schoolStatus,
            };

            if (selectedFaculty) {
                schoolData.school_faculty_id = selectedFaculty.id;
            }

            // Special case for "other" school
            if (selectedSchool.id === OTHER_SCHOOL_ID) {
                schoolData.other_text = otherSchoolText;
            }

            await API.schools.addUserSchool(schoolData);
            await refetchProfile();
            onSuccess();

            toast({
                title: "Úspěch",
                description: "Škola byla úspěšně přidána.",
            });

            // Reset and close
            handleClose();
        } catch (error) {
            console.error("Error adding school:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se přidat školu. Zkus to prosím znovu.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveUserSchool = async (userSchoolId: number) => {
        setRemovingSchoolIds((prev) => ({ ...prev, [userSchoolId]: true }));
        try {
            await API.schools.removeUserSchool({ user_school_id: userSchoolId });
            await refetchProfile();
            onSuccess();
            toast({
                title: "Úspěch",
                description: "Škola byla odstraněna.",
            });
        } catch (error) {
            console.error("Error removing school:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se odstranit školu. Zkus to prosím znovu.",
                variant: "destructive",
            });
        } finally {
            setRemovingSchoolIds((prev) => ({ ...prev, [userSchoolId]: false }));
        }
    };

    const handleClose = () => {
        setSchoolSearchQuery("");
        setSchools([]);
        setSelectedSchool(null);
        setSelectedFaculty(null);
        setSchoolStatus("");
        setOtherSchoolText("");
        setShowOtherSchoolOption(false);
        onOpenChange(false);
    };

    // Debounce school search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (schoolSearchQuery) {
                searchSchools(schoolSearchQuery);
            } else {
                setSchools([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [schoolSearchQuery]);

    // Show "other school" option after 7 seconds
    useEffect(() => {
        if (open && !selectedSchool) {
            const timer = setTimeout(() => {
                setShowOtherSchoolOption(true);
            }, 7000);
            return () => clearTimeout(timer);
        } else {
            setShowOtherSchoolOption(false);
        }
    }, [open, selectedSchool]);

    // Reset when dialog closes
    useEffect(() => {
        if (!open) {
            handleClose();
        }
    }, [open]);

    const canSave =
        (selectedSchool &&
            selectedSchool.id !== OTHER_SCHOOL_ID &&
            ((selectedSchool.faculties &&
                selectedSchool.faculties.length > 0 &&
                selectedFaculty) ||
                !selectedSchool.faculties ||
                selectedSchool.faculties.length === 0) &&
            schoolStatus) ||
        (selectedSchool &&
            selectedSchool.id === OTHER_SCHOOL_ID &&
            otherSchoolText &&
            schoolStatus);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Kde studuješ nebo jsi studoval/a ?</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div className="space-y-2">

                        {isProfileLoading ? (
                            <div className="flex justify-center py-2">
                                <Loader2 className="w-5 h-5 animate-spin text-green-500" />
                            </div>
                        ) : isProfileError ? (
                            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center space-y-3">
                                <p className="text-sm text-foreground">
                                    Profil se nepodařilo načíst. Zkus to znovu.
                                </p>
                                <Button variant="outline" size="sm" onClick={() => refetchProfile()}>
                                    Zkus znovu
                                </Button>
                            </div>
                        ) : (userProfile?.data?.userSchools?.length ?? 0) > 0 ? (
                            <>
                                <h3 className="text-sm font-semibold text-gray-900">Tvoje vzdělání</h3>
                                <div className="space-y-2 pb-4">
                                    {(userProfile?.data?.userSchools ?? []).map((school: any) => (
                                        <div
                                            key={school.id}
                                            className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium text-xs text-gray-900 break-words">
                                                    {school.school?.id === OTHER_SCHOOL_ID
                                                        ? school.otherText || "Nevyplněná škola"
                                                        : school.school?.name}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {school.schoolFaculty?.name ? `${school.schoolFaculty.name} • ` : ""}
                                                    {school.status ? getSchoolStatusString(school.status) : ""}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveUserSchool(school.id)}
                                                disabled={!!removingSchoolIds[school.id]}
                                                className="shrink-0 text-gray-500 hover:text-white"
                                                aria-label="Odstranit školu"
                                            >
                                                {removingSchoolIds[school.id] ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <></>
                        )}
                    </div>

                    <div className="">
                        <Label htmlFor="school-search">Vyhledat školu</Label>
                        <Input
                            id="school-search"
                            placeholder="Zadej název školy..."
                            value={schoolSearchQuery}
                            onChange={(e) => setSchoolSearchQuery(e.target.value)}
                            className="mt-2"
                        />
                    </div>

                    {isSearchingSchools && (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                        </div>
                    )}

                    {showOtherSchoolOption && !selectedSchool && (
                        <div className="text-center text-xs py-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedSchool({
                                        id: OTHER_SCHOOL_ID,
                                        name: "Jiná škola",
                                        city: "",
                                        rid: "",
                                        type: 0,
                                        faculties: [],
                                    });
                                    setSchoolSearchQuery("Nemohu nalézt mou školu()");
                                }}
                                className="text-sm text-blue-600 underline"
                            >
                                Nemůžeš najít svojí školu?
                            </button>
                        </div>
                    )}

                    {!isSearchingSchools && schools.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {(selectedSchool &&
                                selectedSchool.id !== OTHER_SCHOOL_ID
                                ? [selectedSchool]
                                : schools
                            ).map((school, index) => (
                                <div
                                    key={`${school.id}-${index}`}
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedSchool?.id === school.id
                                        ? "border-green-500 bg-green-50"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    onClick={() => {
                                        handleSchoolSelect(school);
                                    }}
                                >
                                    <p className="text-xs font-medium">
                                        {school.name}{" "}
                                        {school.city && `(${school.city})`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedSchool && selectedSchool.id === OTHER_SCHOOL_ID && (
                        <div className="space-y-4 pt-4 ">
                            <div>
                                <Label htmlFor="other-school">
                                    Doplňte název školy a město
                                </Label>
                                <Input
                                    id="other-school"
                                    value={otherSchoolText}
                                    onChange={(e) =>
                                        setOtherSchoolText(e.target.value)
                                    }
                                    placeholder="Název školy a město"
                                    className="mt-2"
                                    maxLength={400}
                                />
                            </div>
                            <div>
                                <Label htmlFor="school-status-other">
                                    Který ročník studuješ?
                                </Label>
                                <SchoolStatusSelect
                                    id="school-status-other"
                                    value={schoolStatus}
                                    onValueChange={setSchoolStatus}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    )}

                    {selectedSchool &&
                        selectedSchool.id !== OTHER_SCHOOL_ID && (
                            <div className="space-y-4 ">
                                {selectedSchool.faculties &&
                                    selectedSchool.faculties.length > 0 && (
                                        <div>
                                            <Label htmlFor="faculty">Fakulta</Label>
                                            <Select
                                                value={
                                                    selectedFaculty?.id?.toString() ||
                                                    undefined
                                                }
                                                onValueChange={(value) => {
                                                    const faculty =
                                                        (selectedSchool.faculties ?? []).find(
                                                            (f: FacultyLookup) =>
                                                                f.id.toString() ===
                                                                value
                                                        );
                                                    setSelectedFaculty(
                                                        faculty || null
                                                    );
                                                }}
                                            >
                                                <SelectTrigger
                                                    id="faculty"
                                                    className="mt-2"
                                                >
                                                    <SelectValue placeholder="Vyber fakultu" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(selectedSchool.faculties ?? []).map(
                                                        (faculty: FacultyLookup) => (
                                                            <SelectItem
                                                                key={faculty.id}
                                                                value={faculty.id.toString()}
                                                            >
                                                                {faculty.name}
                                                            </SelectItem>
                                                        )
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                <div>
                                    <Label htmlFor="school-status-regular">
                                        Který ročník studuješ?
                                    </Label>
                                    <SchoolStatusSelect
                                        id="school-status-regular"
                                        value={schoolStatus}
                                        onValueChange={setSchoolStatus}
                                        className="mt-2"
                                    />
                                </div>
                            </div>
                        )}

                    <div className="pt-4">
                        <Button
                            onClick={handleAddSchool}
                            disabled={isLoading || !canSave}
                            className="w-full"
                        >
                            {isLoading ? "Ukládám..." : "ULOŽIT"}
                        </Button>
                    </div>


                </div>
            </DialogContent>
        </Dialog>
    );
};
