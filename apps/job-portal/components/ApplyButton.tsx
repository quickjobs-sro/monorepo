"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@ui/components/core/button";
import { TrackedButton } from "@ui/components/core/tracked-button";
import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../lib/legacyApi";
import { useToast } from "@ui/hooks/use-toast";
import { useGetProfile } from "../hooks/useGetProfile";
import { useTokenRestore } from "./TokenRestoreProvider";
import { getAuthToken, isValidToken } from "../lib/constants";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@ui/components/core/dialog";
import { API_KEYS } from "@ui/types/api_keys";
import { savePendingJobAction } from "../lib/utils";
import { reportError } from "../lib/reportError";

interface ApplyButtonProps {
    jobId: number;
}

export function ApplyButton({ jobId }: ApplyButtonProps) {
    const router = useRouterWithNavigationLoading();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { mounted, tokenRestored } = useTokenRestore();
    const token = getAuthToken();
    const hasValidToken = mounted && tokenRestored && !!token && isValidToken(token);
    const { data: userProfile } = useGetProfile(!!hasValidToken);
    const user = userProfile?.data;

    const isLoggedIn = mounted && token && user;
    const hasCompletedOnboarding = user?.email && user.email.length > 0;

    const [isDisabled, setIsDisabled] = useState(false);
    const [lastClickTime, setLastClickTime] = useState(0);
    const [showFillModal, setShowFillModal] = useState(false);
    const [showCheckModal, setShowCheckModal] = useState(false);
    const [showInterested, setShowInterested] = useState(false);
    const mutationInProgressRef = useRef(false);

    const jobDetailUrl = `/jobs/detail/${jobId}`;

    useEffect(() => {
        if (user) {
            setIsDisabled(false);
            mutationInProgressRef.current = false;
        }
    }, [user]);

    const jobMutation = useMutation({
        mutationFn: () => {
            if (mutationInProgressRef.current) throw new Error("Mutation already in progress");
            mutationInProgressRef.current = true;

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Application API timeout")), 5000)
            );

            return Promise.race([
                API.applications.createApplication(jobId, "apply"),
                timeoutPromise,
            ]) as Promise<any>;
        },
        mutationKey: ["jobApplication", jobId],
        onSuccess: () => {
            mutationInProgressRef.current = false;
            setTimeout(() => { mutationInProgressRef.current = false; }, 10000);
            setShowCheckModal(false);
            setShowInterested(true);
            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS] });
            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOB_APPLICATIONS, "myApplications"] });
            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS, "external"] });
        },
        onError: (error: any) => {
            mutationInProgressRef.current = false;
            reportError(error, { location: "ApplyButton.application", jobId });

            if (error?.message?.includes("timeout")) {
                setIsDisabled(false);
                toast({ title: "Přihláška se neodeslala - zkus to znovu", variant: "destructive", duration: 3000 });
            } else if (error?.response?.status === 409) {
                toast({ title: "Už jsi se k této nabídce přihlásil/a", duration: 3000 });
            } else {
                setIsDisabled(false);
                toast({ title: "Chyba při odesílání - zkus to znovu", variant: "destructive", duration: 3000 });
            }
        },
    });

    const handleApply = useCallback(() => {
        if (!isLoggedIn) {
            savePendingJobAction({ jobId, action: "apply", returnUrl: jobDetailUrl });
            router.push(`/login?returnUrl=${encodeURIComponent(jobDetailUrl)}`);
            return;
        }

        if (!hasCompletedOnboarding) {
            router.push(`/onboarding?returnUrl=${encodeURIComponent(jobDetailUrl)}`);
            return;
        }

        if (isDisabled) return;

        const now = Date.now();
        if (now - lastClickTime < 1000) return;

        setLastClickTime(now);
        setIsDisabled(true);

        if (
            (!user?.skills || user.skills.length === 0) &&
            (!user?.experience || user.experience.length === 0) &&
            (!user?.description || user.description.length === 0)
        ) {
            setShowFillModal(true);
        } else {
            setShowCheckModal(true);
        }
    }, [isLoggedIn, hasCompletedOnboarding, lastClickTime, isDisabled, user, router, jobId, jobDetailUrl]);

    return (
        <>
            <TrackedButton
                variant="default"
                size="lg"
                className="uppercase w-full mt-2"
                onClick={handleApply}
                disabled={isDisabled}
                gaCategory="Company job card"
                gaAction="Mám zájem"
                gaLabel={String(jobId)}
            >
                Mám zájem
            </TrackedButton>

            <Dialog open={showFillModal} onOpenChange={setShowFillModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Vyplňte nejprve svůj profil</DialogTitle>
                        <DialogDescription>
                            Pro přihlášení k nabídce je potřeba mít vyplněný profil.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowFillModal(false); setIsDisabled(false); }}>
                            Zrušit
                        </Button>
                        <TrackedButton
                            onClick={() => { setShowFillModal(false); router.push(`/profile/edit?returnUrl=${encodeURIComponent(jobDetailUrl)}`); }}
                            className="bg-primary"
                            gaCategory="Company job card"
                            gaAction="Jít na profil"
                            gaLabel="fill modal"
                        >
                            Jít na profil
                        </TrackedButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showCheckModal} onOpenChange={(open) => { setShowCheckModal(open); if (!open) setIsDisabled(false); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Máš zájem o tuto nabídku?</DialogTitle>
                        <DialogDescription className="mt-2">
                            Odešleme tvůj profil s kontaktními údaji, aby se s tebou mohl zaměstnavatel spojit.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col-reverse sm:flex-row gap-3">
                        <TrackedButton
                            variant="outline"
                            onClick={() => { setShowCheckModal(false); router.push(`/profile/edit?returnUrl=${encodeURIComponent(jobDetailUrl)}`); }}
                            gaCategory="Company job card"
                            gaAction="Jít na profil"
                            gaLabel="check modal"
                        >
                            ZKONTROLOVAT PROFIL
                        </TrackedButton>
                        <TrackedButton
                            onClick={() => jobMutation.mutate()}
                            className="bg-primary"
                            gaCategory="Company job card"
                            gaAction="Mám zájem confirm"
                            gaLabel={String(jobId)}
                        >
                            ANO, MÁM ZÁJEM
                        </TrackedButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showInterested} onOpenChange={setShowInterested}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Odesláno! ✅</DialogTitle>
                        <DialogDescription>
                            <div className="space-y-2 mt-2">
                                <p>Tvůj životopis už míří ke správným lidem.</p>
                                <p className="font-semibold">ZLEPŠI SI KARMU 👍</p>
                                <p>Pomoz svým známým. Čím víc nás bude, tím víc top nabídek od firem.</p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => { setShowInterested(false); router.push("/jobs"); }} className="bg-primary">
                            OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
