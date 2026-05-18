"use client";

import { useEffect, useState } from "react";
import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";
import { getAuthToken } from "../../lib/constants";
import { Onboarding } from "../../components/Onboarding";
import { getPendingJobAction, clearPendingJobAction, ensureAbsoluteUrl, type PendingJobAction } from "../../lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@ui/hooks/use-toast";
import { API_KEYS } from "@ui/types/api_keys";
import { useTokenRestore } from "../../components/TokenRestoreProvider";
import { useGetProfile } from "../../hooks/useGetProfile";
import API from "../../lib/legacyApi";

const CONGRATULATIONS_STEP = 3;

export default function OnboardingPage() {
    const router = useRouterWithNavigationLoading();
    const { mounted, tokenRestored } = useTokenRestore();
    const token = mounted && tokenRestored ? getAuthToken() : null;
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [forcedStep, setForcedStep] = useState<number | null>(null);
    const { data: userProfile } = useGetProfile(!!token);

    // Registered users (email + schools) see congratulations step first – incl. after SMS redirect
    useEffect(() => {
        if (!token || !userProfile?.data) return;
        const user = userProfile.data;
        const isRegistered =
            (user.email?.length ?? 0) > 0 && (user.userSchools?.length ?? 0) > 0;
        if (isRegistered) {
            const pendingAction = getPendingJobAction();
            const startStep = pendingAction ? CONGRATULATIONS_STEP : CONGRATULATIONS_STEP + 1;
            setForcedStep((prev) => (prev === null ? startStep : prev));
        }
    }, [token, userProfile?.data]);

    useEffect(() => {
        if (mounted && tokenRestored && !token) {
            router.push("/login?returnUrl=/onboarding");
        }
    }, [mounted, tokenRestored, token, router]);

    const executePendingJobAction = async (pendingAction: PendingJobAction): Promise<void> => {
        try {
            if (pendingAction.action === "open_url") {
                clearPendingJobAction();
                if (pendingAction.url) {
                    window.open(ensureAbsoluteUrl(pendingAction.url), "_blank", "noopener,noreferrer");
                }
                try {
                    await API.applications.createApplication(pendingAction.jobId, "apply");
                    queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS] });
                    queryClient.invalidateQueries({ queryKey: [API_KEYS.JOB_APPLICATIONS, "myApplications"] });
                    queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS, "external"] });
                } catch {
                    // non-fatal — URL already opened
                }
                setForcedStep(CONGRATULATIONS_STEP);
                return;
            }

            if (pendingAction.action === "external_apply") {
                clearPendingJobAction();
                try {
                    await API.applications.createExternalApplication({ action: "apply", externalJobId: pendingAction.jobId });
                    queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS, "external"] });
                    queryClient.invalidateQueries({ queryKey: [API_KEYS.JOB_APPLICATIONS, "myApplications"] });
                    if (pendingAction.url) {
                        window.open(ensureAbsoluteUrl(pendingAction.url), "_blank", "noopener,noreferrer");
                    }
                } catch {
                    // non-fatal
                }
                setForcedStep(CONGRATULATIONS_STEP);
                return;
            }

            await API.applications.createApplication(pendingAction.jobId, pendingAction.action);

            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS] });
            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOB_APPLICATIONS, "myApplications"] });
            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS, "external"] });

            if (pendingAction.action === "apply") {
                setForcedStep(CONGRATULATIONS_STEP);
                clearPendingJobAction();
                return;
            } else {
                toast({
                    title: "Status: Nemám zájem",
                    duration: 3000,
                });
            }

            clearPendingJobAction();
            setForcedStep(null);
            if (pendingAction.returnUrl) {
                router.push(pendingAction.returnUrl);
            } else {
                router.push("/jobs");
            }
        } catch (error: any) {
            console.error("Failed to execute pending job action:", error);
            clearPendingJobAction();

            const status = error?.response?.status || error?.status || error?.statusCode;
            const isConflict = status === 409 || error?.message?.includes("409") || error?.message?.includes("already");

            if (isConflict) {
                toast({
                    title: "Už jsi se k této nabídce přihlásil/a ✅",
                    description: "Tvá přihláška je již odeslaná.",
                    duration: 5000,
                });
                setForcedStep(CONGRATULATIONS_STEP);
                return;
            } else {
                toast({
                    title: "Chyba při odesílání",
                    description: "Zkus to prosím znovu po dokončení.",
                    variant: "destructive",
                    duration: 3000,
                });
            }

            setForcedStep(null);
            if (pendingAction.returnUrl) {
                router.push(pendingAction.returnUrl);
            } else {
                router.push("/jobs");
            }
        }
    };

    const handleOnboardingComplete = async () => {
        const pendingAction = getPendingJobAction();
        if (pendingAction) {
            await executePendingJobAction(pendingAction);
        } else {
            setForcedStep(null);
            router.push("/jobs");
        }
    };

    if (!mounted || !tokenRestored) {
        return (
            <main className="flex flex-col items-center min-h-screen">
                <div className="w-screen bg-blue py-16 px-8 flex items-center justify-center shadow-md">
                    <img src="/logo.svg" alt="QuickJOBS Logo" className="h-[100px] w-[300px]" />
                </div>
                <div className="flex items-center justify-center mt-[-50px] bg-transparent ">
                    <div className="w-[420px] sm:w-[520px] md:w-[640px] lg:w-[720px] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-md h-[720px]" />
                </div>
            </main>
        );
    }

    if (!token) return null;

    return (
        <main className="flex flex-col items-center min-h-screen">
            <div className="w-screen bg-blue py-16 px-8 flex items-center justify-center shadow-md">
                <img src="/logo.svg" alt="QuickJOBS Logo" className="h-[100px] w-[300px]" />
            </div>

            <div className="flex items-center justify-center mt-[-50px] bg-transparent ">
                <Onboarding
                    onComplete={handleOnboardingComplete}
                    autoDetectStep={forcedStep === null}
                    showCard={true}
                    requireSchools={true}
                    step={forcedStep ?? undefined}
                    onStepChange={(s) => {
                        const pendingAction = getPendingJobAction();
                        setForcedStep(s === CONGRATULATIONS_STEP && !pendingAction ? CONGRATULATIONS_STEP + 1 : s);
                    }}
                />
            </div>
        </main>
    );
}
