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

import { Loader2 } from "lucide-react";
import { useGetProfile } from "@ui/hooks/useGetProfile";
import { useToast } from "@ui/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@ui/components/core/card";

import { useOnboardingStep } from "./hooks/useOnboardingStep";
import { useOnboardingForm } from "./hooks/useOnboardingForm";
import { useOnboardingActions } from "./hooks/useOnboardingActions";
import { useAvatarUpload } from "./hooks/useAvatarUpload";
import { getStepTitle, getStepDescription } from "./helpers/onboardingHelpers";
import { PersonalDetailsForm } from "./components/PersonalDetailsForm";
import { AvatarUpload } from "./components/AvatarUpload";
import { SchoolsManagement } from "./components/SchoolsManagement";
import { LocationSetup } from "./components/LocationSetup";
import { OnboardingCompletion } from "./components/OnboardingCompletion";

export type OnboardingProps = {
    /**
     * Callback when onboarding is completed
     */
    onComplete?: () => void;
    /**
     * Initial step to start from (1-5). If not provided, will auto-detect based on user profile
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
     * Default location coordinates for step 4
     */
    defaultLocation?: {
        latitude: number;
        longitude: number;
        address: string;
    };
    /**
     * Custom render function for school selection button
     */
    onAddSchool?: () => void;
};

export const Onboarding = ({
    onComplete,
    initialStep,
    showCard = true,
    logoUrl = "/logo.svg",
    className = "",
    autoDetectStep = true,
    requireSchools = false,
    defaultLocation = {
        latitude: 50.0755,
        longitude: 14.4378,
        address: "Praha",
    },
    onAddSchool,
}: OnboardingProps) => {
    const { toast } = useToast();
    const { data: userProfile, refetch: refetchProfile } = useGetProfile();

    const { step, setStep, profileLoading, userProfile: stepUserProfile } =
        useOnboardingStep(initialStep, autoDetectStep);

    const { control, handleSubmit, errors, isValid } = useOnboardingForm(
        stepUserProfile || userProfile
    );

    const {
        isLoading,
        updatePersonalDetails,
        uploadAvatar,
        setupLocation,
        removeSchool,
    } = useOnboardingActions(refetchProfile, setStep);

    const { avatarFile, avatarPreview, handleAvatarChange } = useAvatarUpload(
        userProfile?.data?.avatarImage?.url
    );

    const handlePersonalDetailsSubmit = handleSubmit(async (data) => {
        await updatePersonalDetails(data);
    });

    const handleAvatarContinue = async () => {
        await uploadAvatar(avatarFile);
    };

    const handleLocationSetup = async () => {
        await setupLocation(defaultLocation, userProfile);
    };

    const handleRemoveSchool = async (schoolId: number) => {
        await removeSchool(schoolId, refetchProfile);
    };

    const handleAddSchool = () => {
        if (onAddSchool) {
            onAddSchool();
        } else {
            toast({
                title: "Info",
                description:
                    "Výběr školy bude brzy dostupný. Prozatím můžeš pokračovat bez školy, ale doporučujeme ji přidat později v nastavení profilu.",
            });
        }
    };

    const handleComplete = () => {
        if (onComplete) {
            onComplete();
        }
    };

    if (profileLoading || step === 0) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        );
    }

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <PersonalDetailsForm
                        control={control}
                        errors={errors}
                        isValid={isValid}
                        isLoading={isLoading}
                        onSubmit={handlePersonalDetailsSubmit}
                        submitLabel="Pokračovat"
                    />
                );
            case 2:
                return (
                    <AvatarUpload
                        avatarPreview={avatarPreview}
                        isLoading={isLoading}
                        onAvatarChange={handleAvatarChange}
                        onSave={handleAvatarContinue}
                        buttonLabel="Pokračovat"
                    />
                );
            case 3:
                return (
                    <SchoolsManagement
                        schools={userProfile?.data?.userSchools}
                        isLoading={isLoading}
                        requireSchools={requireSchools}
                        onAddSchool={handleAddSchool}
                        onRemoveSchool={handleRemoveSchool}
                        onContinue={() => setStep(4)}
                        continueButtonLabel="Pokračovat"
                        note={!requireSchools ? "Poznámka: Školu můžeš přidat později v nastavení profilu" : undefined}
                    />
                );
            case 4:
                return (
                    <LocationSetup
                        locationAddress={defaultLocation.address}
                        isLoading={isLoading}
                        onSetup={handleLocationSetup}
                        buttonLabel="Nastavit lokaci"
                    />
                );
            case 5:
                return <OnboardingCompletion onComplete={handleComplete} />;
            default:
                return null;
        }
    };

    const content = (
        <>
            {showCard && (
                <CardHeader className="text-center pb-4">
                    <img
                        src={logoUrl}
                        alt="QuickJOBS Logo"
                        className="h-12 mx-auto mb-4"
                    />
                    <h1 className="text-2xl font-bold text-gray-900">
                        {getStepTitle(step)}
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        {getStepDescription(step)}
                    </p>
                </CardHeader>
            )}
            <CardContent className={!showCard ? "p-0" : ""}>
                {renderStepContent()}
            </CardContent>
        </>
    );

    if (showCard) {
        return (
            <div className={`w-full max-w-4xl ${className}`}>
                <Card>{content}</Card>
            </div>
        );
    }

    return <div className={className}>{content}</div>;
};

