import { useEffect, useState } from "react";
import { useGetProfile } from "@ui/hooks/useGetProfile";
import { detectOnboardingStep } from "../helpers/onboardingHelpers";

export const useOnboardingStep = (
    initialStep?: number,
    autoDetectStep: boolean = true
) => {
    const [step, setStep] = useState(initialStep || 0);
    const { data: userProfile, isLoading: profileLoading } = useGetProfile();

    useEffect(() => {
        if (!autoDetectStep || profileLoading || !userProfile?.data) return;
        if (initialStep !== undefined) return; // Don't auto-detect if initialStep is explicitly set

        const detectedStep = detectOnboardingStep(userProfile);
        setStep(detectedStep);
    }, [userProfile, profileLoading, autoDetectStep, initialStep]);

    return {
        step,
        setStep,
        profileLoading,
        userProfile,
    };
};


