"use client";

/**
 * Reusable Onboarding Component
 * 
 * @example
 * // Basic usage in a page
 * <Onboarding onComplete={() => router.push("/")} />
 * 
 * @example
 * // In a dialog/modal without card wrapper
 * <Dialog>
 *   <DialogContent>
 *     <Onboarding 
 *       showCard={false}
 *       onComplete={() => setOpen(false)}
 *       initialStep={2}
 *     />
 *   </DialogContent>
 * </Dialog>
 * 
 * @example
 * // With custom school selection handler
 * <Onboarding 
 *   onAddSchool={() => setSchoolDialogOpen(true)}
 *   requireSchools={true}
 *   defaultLocation={{ latitude: 49.2, longitude: 16.6, address: "Brno" }}
 * />
 */

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { format, differenceInYears } from "date-fns";
import { Loader2, Camera, Check, X } from "lucide-react";

import { useGetProfile } from "../hooks/useGetProfile";
import { API_KEYS } from "@ui/types/api_keys";
import { useToast } from "@ui/hooks/use-toast";
import { getSchoolStatusString } from "@ui/helpers/getSchoolStatusString";
import { getPendingJobAction, clearPendingJobAction, type PendingJobAction } from "../lib/utils";
import { Button } from "@ui/components/core/button";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import { Textarea } from "@ui/components/core/textarea";
import { BirthDatePicker } from "@ui/components/core/BirthDatePicker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@ui/components/core/select";
import { Card, CardContent, CardHeader } from "@ui/components/core/card";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/core/avatar";
import { SchoolModal } from "./modals/SchoolModal";
import { SkillsForm } from "./SkillsForm";
import { ExperienceForm, type Experience } from "./ExperienceForm";
import { ProfileImageManager, type ProfileImage } from "@ui/components/profile/ProfileImageManager";
import { cn } from "@ui/lib/utils";
import API, { NOTIFICATION_CHANNEL, NOTIFICATION_TRIGGER } from "../lib/legacyApi";

const personalDetailsSchema = z.object({
    givenName: z.string().min(1, "Jméno je povinné"),
    familyName: z.string().min(1, "Příjmení je povinné"),
    email: z.string().email("Neplatný e-mail").min(1, "E-mail je povinný"),
    birthDate: z.date({
        required_error: "Datum narození je povinné",
    }).refine((date) => {
        const age = differenceInYears(new Date(), date);
        return age >= 15;
    }, "Musíš být starší 15 let"),
    gender: z.enum(["male", "female"], {
        required_error: "Pohlaví je povinné",
    }),
    userSource: z.string().min(1, "Odkud ses o QuickJOBS dozvěděl/a?"),
});

type PersonalDetailsForm = z.infer<typeof personalDetailsSchema>;

export type OnboardingProps = {
    /**
     * Callback when onboarding is completed
     */
    onComplete?: () => void;
    /**
     * Initial step to start from (1-8). If not provided, will auto-detect based on user profile
     */
    initialStep?: number;
    /**
     * Whether to show the card wrapper. Set to false if using in a custom container
     */
    showCard?: boolean;
    /**
     * Custom logo URL. Defaults to "/logo.svg"
     */
    logoUrl?: string;
    /**
     * Custom className for the container
     */
    className?: string;
    /**
     * Whether to auto-detect step based on user profile. Defaults to true
     */
    autoDetectStep?: boolean;
    /**
     * Whether schools are required. Defaults to false (optional)
     */
    requireSchools?: boolean;
    /**
     * Custom render function for school selection button
     */
    onAddSchool?: () => void;
    /**
     * Controlled step (1-8). When set, component shows this step; use with onStepChange to drive from parent.
     */
    step?: number;
    /**
     * Called when step would change (e.g. user clicks "Pokračovat"). Use with controlled step.
     */
    onStepChange?: (step: number) => void;
};

export const Onboarding = ({
    onComplete,
    initialStep,
    showCard = true,
    logoUrl = "/logo.svg",
    className = "",
    autoDetectStep = true,
    requireSchools = false,
    onAddSchool,
    step: controlledStep,
    onStepChange,
}: OnboardingProps) => {
    const router = useRouterWithNavigationLoading();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [internalStep, setInternalStep] = useState(initialStep || 0);
    const step = controlledStep !== undefined ? controlledStep : internalStep;

    const goToStep = (nextStep: number) => {
        if (onStepChange) {
            onStepChange(nextStep);
        } else {
            setInternalStep(nextStep);
        }
    };
    const [isLoading, setIsLoading] = useState(false);
    const [isSchoolDialogOpen, setIsSchoolDialogOpen] = useState(false);
    const [skills, setSkills] = useState<string[]>([]);
    const [description, setDescription] = useState("");
    const [experiences, setExperiences] = useState<Experience[]>([]);
    const hasAutoDetectedRef = useRef(false);
    const hasExecutedPendingActionRef = useRef(false);
    const hasAutoOpenedSchoolModalRef = useRef(false);

    const { data: userProfile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useGetProfile();

    const {
        control,
        handleSubmit,
        setValue,
        formState: { errors, isValid },
    } = useForm<PersonalDetailsForm>({
        resolver: zodResolver(personalDetailsSchema),
        mode: "onChange",
        defaultValues: {
            givenName: "",
            familyName: "",
            email: "",
            birthDate: undefined,
            gender: undefined,
            userSource: "",
        },
    });

    // Update form values when user profile loads
    useEffect(() => {
        if (userProfile?.data) {
            const user = userProfile.data;
            if (user.givenName) setValue("givenName", user.givenName, { shouldValidate: true });
            if (user.familyName) setValue("familyName", user.familyName, { shouldValidate: true });
            if (user.email) setValue("email", user.email, { shouldValidate: true });
            if (user.birthDate) setValue("birthDate", new Date(user.birthDate), { shouldValidate: true });
            if (user.gender) setValue("gender", user.gender as "male" | "female", { shouldValidate: true });
        }
    }, [userProfile, setValue]);

    const hasLoadedInitialDataRef = useRef(false);

    // Load existing data when profile loads
    useEffect(() => {
        if (userProfile?.data && !hasLoadedInitialDataRef.current) {
            const user = userProfile.data;
            if (user.skills) setSkills(user.skills);
            if (user.description) setDescription(user.description);
            if (user.experience) {
                setExperiences(user.experience.map((item) => ({
                    title: item.title ?? "",
                    companyName: item.companyName ?? "",
                })));
            }
            hasLoadedInitialDataRef.current = true;
        }
    }, [userProfile]);

    // Determine initial step based on user data (only once on mount)
    useEffect(() => {
        if (!autoDetectStep || profileLoading || !userProfile?.data) return;
        if (initialStep !== undefined) return; // Don't auto-detect if initialStep is explicitly set
        if (hasAutoDetectedRef.current) return; // Only auto-detect once

        const user = userProfile.data;
        const hasEmail = user.email && user.email.length > 0;
        const hasSchools = user.userSchools && user.userSchools.length > 0;

        if (!hasEmail) {
            setInternalStep(1);
        } else if (!hasSchools) {
            setInternalStep(2);
        } else {
            setInternalStep(3); // Crossroad
        }

        hasAutoDetectedRef.current = true;
    }, [userProfile, profileLoading, autoDetectStep, initialStep]);

    // When on step 2 and user has no schools, open school modal immediately
    useEffect(() => {
        if (
            step !== 2 ||
            profileLoading ||
            !userProfile?.data ||
            hasAutoOpenedSchoolModalRef.current
        )
            return;
        const schools = userProfile.data.userSchools;
        if (!schools || schools.length === 0) {
            hasAutoOpenedSchoolModalRef.current = true;
            setIsSchoolDialogOpen(true);
        }
    }, [step, profileLoading, userProfile?.data]);

    // Execute pending job action when step 3 is reached (congratulations screen)
    useEffect(() => {
        // Only execute once when step 3 is reached and user has email (completed onboarding)
        if (step === 3 && !hasExecutedPendingActionRef.current && userProfile?.data?.email) {
            const pendingAction = getPendingJobAction();
            if (pendingAction) {
                hasExecutedPendingActionRef.current = true;

                const executePendingJobAction = async () => {
                    try {
                        if (pendingAction.action === "open_url") {
                            clearPendingJobAction();
                            if (pendingAction.url) {
                                window.open(pendingAction.url, "_blank", "noopener,noreferrer");
                            }
                            try {
                                await API.applications.createApplication(pendingAction.jobId, "apply");
                                queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS] });
                                queryClient.invalidateQueries({ queryKey: [API_KEYS.JOB_APPLICATIONS, "myApplications"] });
                                queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS, "external"] });
                            } catch {
                                // non-fatal — URL already opened
                            }
                            toast({
                                title: "Přihláška odeslána! ✅",
                                description: "Tvůj životopis už míří ke správným lidem.",
                                duration: 5000,
                            });
                            return;
                        }

                        await API.applications.createApplication(pendingAction.jobId, pendingAction.action);

                        // Invalidate queries - TanStack Query automatically marks them as stale
                        // and refetches active queries in the background (refetchType: 'active' by default)
                        queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS] });
                        queryClient.invalidateQueries({ queryKey: [API_KEYS.JOB_APPLICATIONS, "myApplications"] });
                        queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS, "external"] });

                        // Show success message
                        if (pendingAction.action === "apply") {
                            toast({
                                title: "Přihláška odeslána! ✅",
                                description: "Tvůj životopis už míří ke správným lidem.",
                                duration: 5000,
                            });
                        } else {
                            toast({
                                title: "Status: Nemám zájem",
                                duration: 3000,
                            });
                        }

                        // Clear pending action
                        clearPendingJobAction();
                    } catch (error: any) {
                        console.error("Failed to execute pending job action:", error);

                        // Clear pending action even on error to avoid retry loops
                        clearPendingJobAction();

                        // Check for 409 status in multiple possible error structures
                        const status = error?.response?.status || error?.status || error?.statusCode;
                        const isConflict = status === 409 || error?.message?.includes("409") || error?.message?.includes("already");

                        if (isConflict) {
                            // User already applied - this is actually fine, just inform them
                            toast({
                                title: "Už jsi se k této nabídce přihlásil/a ✅",
                                description: "Tvá přihláška je již odeslaná.",
                                duration: 5000,
                            });
                        } else {
                            toast({
                                title: "Chyba při odesílání",
                                description: "Zkus to prosím znovu po dokončení.",
                                variant: "destructive",
                                duration: 3000,
                            });
                        }
                    }
                };

                executePendingJobAction();
            }
        }
    }, [step, userProfile?.data?.email]);

    const handlePersonalDetails = async (data: PersonalDetailsForm) => {
        setIsLoading(true);
        try {
            // Set default location (Prague) when saving personal details
            const user = userProfile?.data;
            const hasLocation = user?.areas && user.areas.length > 0;

            if (!hasLocation) {
                await API.users.addArea({
                    active: true,
                    radius: 25000,
                    place: {
                        latitude: 50.0755,
                        longitude: 14.4378,
                        address: "Praha",
                    },
                });
            }

            await API.users.updateProfile({
                email: data.email,
                givenName: data.givenName,
                familyName: data.familyName,
                gender: data.gender,
                birthDate: format(data.birthDate, "yyyy-MM-dd"),
                user_source: data.userSource,
                roles: ["candidate"],
                subscribedNotifications: {
                    [NOTIFICATION_TRIGGER.NEW_FULL_TIME_JOBS]: [NOTIFICATION_CHANNEL.PHONE],
                    [NOTIFICATION_TRIGGER.NEW_LONG_TERM_JOBS]: [NOTIFICATION_CHANNEL.PHONE],
                    [NOTIFICATION_TRIGGER.NEW_ONE_TIME_JOBS]: [NOTIFICATION_CHANNEL.PHONE],
                },
            });

            await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            await refetchProfile();
            goToStep(2); // Go to schools
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se uložit údaje. Zkus to prosím znovu.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Prepare 4 image slots for onboarding (same as profile edit)
    const profileImages: ProfileImage[] = useMemo(() => {
        const images: ProfileImage[] = [];
        const data = userProfile?.data;

        if (data?.avatarImage?.url) {
            images.push({
                id: "avatar",
                url: data.avatarImage.url,
                alt: "Hlavní profilový obrázek",
                isMain: true,
            });
        } else {
            images.push({
                id: "main-placeholder",
                url: "",
                alt: "Nahrát fotku",
                isMain: true,
            });
        }
        if (data?.bodyImage?.url) {
            images.push({
                id: "body",
                url: data.bodyImage.url,
                alt: "Obrázek těla",
                isMain: false,
            });
        } else {
            images.push({
                id: "body-placeholder",
                url: "",
                alt: "Nahrát obrázek těla",
                isMain: false,
            });
        }
        if (data?.faceImage?.url) {
            images.push({
                id: "face",
                url: data.faceImage.url,
                alt: "Obrázek obličeje",
                isMain: false,
            });
        } else {
            images.push({
                id: "face-placeholder",
                url: "",
                alt: "Nahrát obrázek obličeje",
                isMain: false,
            });
        }
        if (data?.optionalImage?.url) {
            images.push({
                id: "optional",
                url: data.optionalImage.url,
                alt: "Doplňkový obrázek",
                isMain: false,
            });
        } else {
            images.push({
                id: "optional-placeholder",
                url: "",
                alt: "Nahrát doplňkový obrázek",
                isMain: false,
            });
        }
        return images;
    }, [userProfile?.data]);

    const handleAvatarUpload = async () => {
        // Skip if no avatar uploaded, go to final completion
        // ProfileImageManager handles the upload automatically, so we just need to wait a bit
        // and then proceed to next step
        await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
        await refetchProfile();
        goToStep(8); // Go to final completion
    };

    const handleSaveSkills = async () => {
        setIsLoading(true);
        try {
            await API.users.updateProfile({
                skills: skills,
            });
            await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            await refetchProfile();
            goToStep(5); // Go to description
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

    const handleSaveDescription = async () => {
        setIsLoading(true);
        try {
            await API.users.updateProfile({
                description: description || null,
            });
            await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            await refetchProfile();
            goToStep(6); // Go to experience
        } catch (error) {
            console.error("Error saving description:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se uložit popis. Zkus to prosím znovu.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveExperience = async () => {
        setIsLoading(true);
        try {
            await API.users.updateProfile({
                experience: experiences,
            });
            await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            await refetchProfile();
            goToStep(7); // Go to avatar
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

    const handleComplete = () => {
        if (onComplete) {
            onComplete();
        }
    };

    const handleFinalComplete = () => {
        router.push("/");
    };

    const handleAddSchool = () => {
        if (onAddSchool) {
            onAddSchool();
        } else {
            setIsSchoolDialogOpen(true);
        }
    };

    const handleSchoolAdded = async () => {
        await refetchProfile();
        setIsSchoolDialogOpen(false);
    };

    const getStepTitle = () => {
        switch (step) {
            case 1:
                return "Osobní údaje";
            case 2:
                return "Kde studuješ nebo jsi studoval/a";
            case 3:
                return "🥳 \n Gratulujeme! Tvůj zájem o nabídku byl odeslán.";
            case 4:
                return "Vyber své dovednosti";
            case 5:
                return "V jakém oboru se chceš rozvíjet?";
            case 6:
                return "Jaké máš zkušenosti?";
            case 7:
                return "Nahraj svoji fotku";
            case 8:
                return "Máš hotovo! Teď jsi profík!";
            default:
                return "";
        }
    };

    const getStepDescription = () => {
        switch (step) {
            case 1:
                return "Vyplň prosím své osobní údaje";
            case 2:
                return "";
            case 3:
                return "Zároveň si tě mohou nyní firmy vyhledat \n a dát ti pracovní nabídku na míru.";
            case 4:
                return "Ukaž své dovednosti, aby ti mohly firmy dávat relevantní nabídky";
            case 5:
                return "Co děláš ve volné čase?";
            case 6:
                return "Přidej i brigády, školní projekty, ocenění atd.";
            case 7:
                return "";
            case 8:
                return "";
            default:
                return "";
        }
    };

    if (profileLoading || step === 0) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        );
    }

    const content = (
        <>
            {showCard && (
                <CardHeader className="text-center pb-4">
                    <h1 className={cn(`text-2xl font-bold text-gray-900 whitespace-pre-line`, step === 3 && "text-lg sm:text-xl")}>
                        {getStepTitle()}
                    </h1>
                    <p className={cn(`text-sm text-gray-500 mt-2 whitespace-pre-line`, step === 3 && "text-xs sm:text-base border-b pb-4 sm:pb-10")}>
                        {getStepDescription()}
                    </p>
                </CardHeader>
            )}
            <CardContent
                className={cn(
                    "p-0 w-full flex-1 overflow-y-auto [scrollbar-gutter:stable] overflow-x-hidden",
                    !showCard && "p-0"
                )}
            >
                {step === 1 && (
                    <form
                        onSubmit={handleSubmit(handlePersonalDetails)}
                        className="flex min-h-full flex-col"
                    >
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="givenName">Jméno</Label>
                                    <Controller
                                        name="givenName"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                id="givenName"
                                                placeholder="Jméno"
                                                {...field}
                                                className={errors.givenName ? "border-red-500" : ""}
                                            />
                                        )}
                                    />
                                    {errors.givenName && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.givenName.message}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="familyName">Příjmení</Label>
                                    <Controller
                                        name="familyName"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                id="familyName"
                                                placeholder="Příjmení"
                                                {...field}
                                                className={errors.familyName ? "border-red-500" : ""}
                                            />
                                        )}
                                    />
                                    {errors.familyName && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.familyName.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="email">E-mail</Label>
                                <Controller
                                    name="email"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="E-mail"
                                            {...field}
                                            className={errors.email ? "border-red-500" : ""}
                                        />
                                    )}
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="birthDate">Datum narození</Label>
                                    <Controller
                                        name="birthDate"
                                        control={control}
                                        render={({ field }) => (
                                            <BirthDatePicker
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="Vyber datum"
                                                minAge={15}
                                            />
                                        )}
                                    />
                                    {errors.birthDate && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.birthDate.message}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="gender">Pohlaví</Label>
                                    <Controller
                                        name="gender"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger
                                                    id="gender"
                                                    className={errors.gender ? "border-red-500" : ""}
                                                >
                                                    <SelectValue placeholder="Vyber pohlaví" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="male">Muž</SelectItem>
                                                    <SelectItem value="female">Žena</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.gender && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.gender.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="userSource">
                                    Odkud ses o QuickJOBS dozvěděl/a?
                                </Label>
                                <Controller
                                    name="userSource"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            id="userSource"
                                            placeholder="Odkud ses o QuickJOBS dozvěděl/a?"
                                            {...field}
                                            className={errors.userSource ? "border-red-500" : ""}
                                        />
                                    )}
                                />
                                {errors.userSource && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.userSource.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-auto pt-8">
                            <Button
                                type="submit"
                                className="w-full uppercase"
                                disabled={!isValid || isLoading}
                            >
                                {isLoading ? "Ukládám..." : "Pokračovat"}
                            </Button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <div className="flex min-h-full flex-col">
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 text-center">
                                Doplň vzdělání, aby ti mohly firmy dávat relevantní nabídky
                            </p>
                            {profileLoading ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                                </div>
                            ) : profileError ? (
                                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center space-y-3">
                                    <p className="text-sm text-foreground">
                                        Profil se nepodařilo načíst. Zkus to znovu.
                                    </p>
                                    <Button variant="outline" size="sm" onClick={() => refetchProfile()}>
                                        Zkus znovu
                                    </Button>
                                </div>
                            ) : (userProfile?.data?.userSchools?.length ?? 0) > 0 ? (
                                <div className="space-y-2">
                                    {(userProfile?.data?.userSchools ?? []).map((school: any) => (
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
                                                {school.status && (
                                                    <p className="text-sm text-gray-500">
                                                        {school.status === "in_progress"
                                                            ? "Studuje"
                                                            : getSchoolStatusString(school.status)}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={async () => {
                                                    try {
                                                        await API.schools.removeUserSchool({
                                                            user_school_id: school.id,
                                                        });
                                                        await refetchProfile();
                                                    } catch (error) {
                                                        console.error("Error removing school:", error);
                                                        toast({
                                                            title: "Chyba",
                                                            description: "Nepodařilo se odstranit školu.",
                                                            variant: "destructive",
                                                        });
                                                    }
                                                }}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-auto pt-8 space-y-3">
                            <Button
                                onClick={handleAddSchool}
                                variant="outline"
                                className="w-full"
                            >
                                Přidat školu
                            </Button>
                            <Button
                                onClick={() => goToStep(3)}
                                className="w-full uppercase"
                                disabled={isLoading || (requireSchools && !(userProfile?.data?.userSchools?.length ?? 0))}
                            >
                                {isLoading ? "Načítám..." : "Pokračovat"}
                            </Button>
                            {requireSchools && !(userProfile?.data?.userSchools?.length ?? 0) && (
                                <p className="text-xs text-red-500 text-center">
                                    Musíš přidat alespoň jednu školu, abys mohl/a pokračovat
                                </p>
                            )}
                            {!requireSchools && (
                                <p className="text-xs text-gray-400 text-center">
                                    Poznámka: Školu můžeš přidat později v nastavení profilu
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="text-center pt-2 sm:pt-8 px-0 sm:px-4">
                        <div className="mx-auto max-w-2xl space-y-2 sm:space-y-6">
                            <h2 className="text-base sm:text-xl md:text-2xl text-gray-900 leading-snug">
                                <b>Nyní si zvyš šanci 2–3×</b>,<br /> že budeš kontaktován/a.   Za <b>2,5 minuty</b> máš hotovo.
                            </h2>

                            <div className="pt-1 sm:pt-4 flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-4">
                                <Button
                                    onClick={() => goToStep(4)}
                                    className="w-full uppercase order-1"
                                >
                                    Jdu do toho!
                                </Button>
                                <Button
                                    onClick={handleComplete}
                                    variant="outline"
                                    className="w-full uppercase order-2"
                                >
                                    Nechci si zvýšit šanci
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-4">
                        <SkillsForm skills={skills} onChange={setSkills} />
                        <Button
                            onClick={handleSaveSkills}
                            className="w-full uppercase"
                            disabled={isLoading}
                        >
                            {isLoading ? "Ukládám..." : "Pokračovat"}
                        </Button>
                    </div>
                )}

                {step === 5 && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="description">Popis</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Napiš něco o sobě..."
                                rows={6}
                                maxLength={400}
                                className="resize-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {description.length} / 400 znaků
                            </p>
                        </div>
                        <Button
                            onClick={handleSaveDescription}
                            className="w-full uppercase"
                            disabled={isLoading}
                        >
                            {isLoading ? "Ukládám..." : "Pokračovat"}
                        </Button>
                    </div>
                )}

                {step === 6 && (
                    <div className="space-y-4">
                        <ExperienceForm experiences={experiences} onChange={setExperiences} />
                        <Button
                            onClick={handleSaveExperience}
                            className="w-full uppercase"
                            disabled={isLoading}
                        >
                            {isLoading ? "Ukládám..." : "Pokračovat"}
                        </Button>
                    </div>
                )}

                {step === 7 && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 text-center">
                            Dobrá representativní fotka ti pomůže najít práci
                        </p>
                        <div className="flex justify-center">
                            <div className="w-full max-w-2xl mx-auto">
                                <ProfileImageManager
                                    initialImages={profileImages}
                                    emptySlotMainLabel="Nahrát fotku"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleAvatarUpload}
                            className="w-full uppercase"
                            disabled={isLoading}
                        >
                            {isLoading ? "Ukládám..." : "Pokračovat"}
                        </Button>
                    </div>
                )}

                {step === 8 && (
                    <div className="space-y-6 mt-14">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-start">
                            <div className="space-y-4 min-w-0">


                                <ol className="list-decimal pl-5 space-y-3 text-md text-gray-700">
                                    <li>
                                        <span className="font-bold">Získáš nabídky jako první</span>{" "}
                                        – nabídky ti pošleme ihned jak se objeví přímo do telefonu.
                                    </li>
                                    <li>
                                        <span className="font-bold">Přímé kontakty na firmy</span>{" "}
                                        v celostátním seznamu firem otevřených studentům a absolventům.
                                    </li>
                                    <li>
                                        <span className="font-bold">Slevy a výhody</span> od našich partnerů.
                                    </li>
                                </ol>
                                <h2 className="text-xl font-bold text-gray-900 pt-10">
                                    Stáhni si mobilní aplikaci
                                </h2>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-2">
                                    <div className="hidden sm:flex flex-shrink-0">
                                        <Image
                                            width={156}
                                            height={156}
                                            src="/img/qr-app.png"
                                            alt="QR kód pro stažení mobilní aplikace QuickJOBS"
                                            className="object-contain"
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <a
                                            href="https://apps.apple.com/cz/app/quickjobs-cz/id1116612770"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center"
                                        >
                                            <Image
                                                src="/img/app-store-badge.svg"
                                                alt="Download on the App Store"
                                                width={120}
                                                height={40}
                                                className="h-10 w-auto"
                                            />
                                        </a>
                                        <a
                                            href="https://play.google.com/store/apps/details?id=cz.quickjobs.midgard&hl=en"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center"
                                        >
                                            <Image
                                                src="/img/google-play-badge.svg"
                                                alt="Get it on Google Play"
                                                width={135}
                                                height={40}
                                                className="h-10 w-auto"
                                            />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* desktop image (flush into card padding) */}
                            <div className="hidden lg:flex justify-end -mr-2">
                                <Image
                                    src="/img/student.png"
                                    alt="Student s mobilem"
                                    width={350}
                                    height={500}
                                    className="h-[400px] w-auto object-contain pointer-events-none select-none"
                                    priority
                                />
                            </div>
                        </div>

                        {/* mobile/tablet image (normal flow) */}
                        <div className="lg:hidden flex justify-center">
                            <Image
                                src="/img/student.png"
                                alt="Student s mobilem"
                                width={350}
                                height={500}
                                className="w-full max-w-sm h-auto object-contain"
                                priority
                            />
                        </div>

                        <Button onClick={handleFinalComplete} className="w-full uppercase -mt-10">
                            Zobrazit profil
                        </Button>
                    </div>
                )}
            </CardContent>
        </>
    );

    return (
        <>
            {showCard ? (
                <Card
                    className={cn(
                        "w-[420px] sm:w-[520px] md:w-[640px] lg:w-[720px] max-w-[calc(100vw-2rem)] shadow-md z-10 flex flex-col",
                        "p-2 sm:p-6 md:p-8 lg:p-10",
                        className
                    )}
                >
                    {content}
                </Card>
            ) : (
                <div className={className}>{content}</div>
            )}
            <SchoolModal
                open={isSchoolDialogOpen}
                onOpenChange={setIsSchoolDialogOpen}
                onSuccess={handleSchoolAdded}
            />
        </>
    );
};
