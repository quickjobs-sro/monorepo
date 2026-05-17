"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Badge } from "@ui/components/core/badge";
import { Button } from "@ui/components/core/button";
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
import { EXTERNAL_JOB_TYPE } from "@ui/types/application_status";
import { reportError } from "../lib/reportError";
import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";
import { useExternalJobs } from "../hooks/useExternalJobs";
import { savePendingJobAction, ensureAbsoluteUrl } from "../lib/utils";

// localStorage keys — used only for optimistic post-action feedback while the backend query refetches
const LS_APPLIED = "appliedExternalJobs";
const LS_IGNORED = "ignoredExternalJobs";

function readIds(key: string): number[] {
    try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}

function saveId(key: string, id: number) {
    const ids = readIds(key);
    if (!ids.includes(id)) localStorage.setItem(key, JSON.stringify([...ids, id]));
}

interface ExternalApplyButtonProps {
    jobId: number;
    jobUrl?: string;
    ctaText?: string | null;
}

export function ExternalApplyButton({ jobId, jobUrl, ctaText }: ExternalApplyButtonProps) {
    const router = useRouterWithNavigationLoading();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { mounted, tokenRestored } = useTokenRestore();
    const token = getAuthToken();
    const hasValidToken = mounted && tokenRestored && !!token && isValidToken(token);
    const { data: userProfile } = useGetProfile(!!hasValidToken);
    const user = userProfile?.data;
    const isLoggedIn = hasValidToken && !!user;

    const jobDetailUrl = `/jobs/detail/${jobId}`;

    // Backend lists — source of truth for applied/ignored state
    const { data: appliedData } = useExternalJobs(EXTERNAL_JOB_TYPE.APPLIED, isLoggedIn);
    const { data: ignoredData } = useExternalJobs(EXTERNAL_JOB_TYPE.IGNORED, isLoggedIn);
    const backendAppliedIds = appliedData?.jobs?.map((j) => j.id) ?? null;
    const backendIgnoredIds = ignoredData?.jobs?.map((j) => j.id) ?? null;

    // Optimistic local state — used immediately after an action, before backend query refetches
    const [optimisticApplied, setOptimisticApplied] = useState(false);
    const [optimisticIgnored, setOptimisticIgnored] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);
    const [showFillModal, setShowFillModal] = useState(false);
    const [showCheckModal, setShowCheckModal] = useState(false);
    const mutationInProgressRef = useRef(false);
    const pendingPopupRef = useRef<Window | null>(null);

    // Seed optimistic state from localStorage on mount (so UI is instant on revisit)
    useEffect(() => {
        setOptimisticApplied(readIds(LS_APPLIED).includes(jobId));
        setOptimisticIgnored(readIds(LS_IGNORED).includes(jobId));
    }, [jobId]);

    useEffect(() => () => {
        if (pendingPopupRef.current) {
            pendingPopupRef.current.close();
            pendingPopupRef.current = null;
        }
    }, []);

    // Backend is authoritative; fall back to optimistic (localStorage) while backend query loads
    const hasApplied = backendAppliedIds !== null
        ? backendAppliedIds.includes(jobId)
        : optimisticApplied;
    const hasIgnored = backendIgnoredIds !== null
        ? backendIgnoredIds.includes(jobId)
        : optimisticIgnored;

    const hasEmptyProfile =
        (!user?.skills || user.skills.length === 0) &&
        (!user?.experience || user.experience.length === 0) &&
        (!user?.description || user.description.length === 0);

    const ignoreMutation = useMutation({
        mutationFn: () => {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Application API timeout")), 10000)
            );
            return Promise.race([
                API.applications.createExternalApplication({ action: "ignore", externalJobId: jobId }),
                timeoutPromise,
            ]) as Promise<any>;
        },
        mutationKey: ["externalJobIgnore", jobId],
        onSuccess: () => {
            saveId(LS_IGNORED, jobId);
            setOptimisticIgnored(true);
            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS, "external"] });
            toast({ title: "Nabídka označena jako bez zájmu", duration: 3000 });
            router.push("/jobs");
        },
        onError: (error: any) => {
            setIsDisabled(false);
            reportError(error, { location: "ExternalApplyButton.ignore", jobId });
            toast({ title: "Chyba - zkus to znovu", variant: "destructive", duration: 3000 });
        },
    });

    const applyMutation = useMutation({
        mutationFn: () => {
            if (mutationInProgressRef.current) throw new Error("Mutation already in progress");
            mutationInProgressRef.current = true;
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Application API timeout")), 10000)
            );
            return Promise.race([
                API.applications.createExternalApplication({ action: "apply", externalJobId: jobId }),
                timeoutPromise,
            ]) as Promise<any>;
        },
        mutationKey: ["externalJobApplication", jobId],
        onSuccess: () => {
            mutationInProgressRef.current = false;
            saveId(LS_APPLIED, jobId);
            setOptimisticApplied(true);
            setShowCheckModal(false);
            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS, "external"] });
            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOB_APPLICATIONS, "myApplications"] });
            if (jobUrl) {
                if (pendingPopupRef.current) {
                    pendingPopupRef.current.location.href = ensureAbsoluteUrl(jobUrl);
                } else {
                    window.open(ensureAbsoluteUrl(jobUrl), "_blank");
                }
            }
            pendingPopupRef.current = null;
            router.push("/jobs");
        },
        onError: (error: any) => {
            mutationInProgressRef.current = false;
            setIsDisabled(false);
            if (pendingPopupRef.current) {
                pendingPopupRef.current.close();
                pendingPopupRef.current = null;
            }
            if (error?.message === "Mutation already in progress") return;
            reportError(error, { location: "ExternalApplyButton.apply", jobId });
            if (error?.message?.includes("timeout")) {
                toast({ title: "Přihláška se neodeslala - zkus to znovu", variant: "destructive", duration: 3000 });
            } else {
                toast({ title: "Chyba při odesílání - zkus to znovu", variant: "destructive", duration: 3000 });
            }
        },
    });

    const handleInterested = useCallback(() => {
        if (isDisabled) return;
        if (!mounted || !tokenRestored) return;
        if (!hasValidToken) {
            savePendingJobAction({ jobId, action: "external_apply", url: jobUrl, returnUrl: jobDetailUrl });
            router.push(`/login?returnUrl=${encodeURIComponent(jobDetailUrl)}`);
            return;
        }
        if (!user) return;
        if (hasEmptyProfile) {
            setShowFillModal(true);
        } else {
            setShowCheckModal(true);
        }
    }, [isDisabled, hasEmptyProfile, mounted, tokenRestored, hasValidToken, user, router, jobDetailUrl]);

    const handleRevisit = useCallback(() => {
        if (jobUrl) window.open(ensureAbsoluteUrl(jobUrl), "_blank", "noopener,noreferrer");
    }, [jobUrl]);

    const buttonLabel = ctaText || "MÁM ZÁJEM";
    const effectiveHasApplied = isLoggedIn && hasApplied;
    const effectiveHasIgnored = isLoggedIn && hasIgnored;

    return (
        <>
            {effectiveHasApplied && (
                <Badge className="bg-blue-500 text-white border-0 w-fit mb-2">Navštíveno</Badge>
            )}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
                {effectiveHasApplied ? (
                    jobUrl ? (
                        <Button
                            variant="outline"
                            size="lg"
                            className="uppercase w-full"
                            onClick={handleRevisit}
                        >
                            ↗ OTEVŘÍT ZNOVU
                        </Button>
                    ) : (
                        <Button
                            variant="default"
                            size="lg"
                            className="uppercase w-full bg-green-600 hover:bg-green-700 text-white"
                            disabled
                        >
                            ✓ Přihláška odeslána
                        </Button>
                    )
                ) : (
                    <>
                        {(isLoggedIn && !effectiveHasIgnored) && (
                            <Button
                                variant="destructive"
                                size="lg"
                                className="uppercase w-full"
                                onClick={() => { setIsDisabled(true); ignoreMutation.mutate(); }}
                                disabled={isDisabled || ignoreMutation.isPending || applyMutation.isPending}
                            >
                                NEMÁM ZÁJEM
                            </Button>
                        )}
                        <Button
                            variant="default"
                            size="lg"
                            className="uppercase w-full"
                            onClick={handleInterested}
                            disabled={isDisabled || ignoreMutation.isPending || applyMutation.isPending}
                        >
                            {buttonLabel}
                        </Button>
                    </>
                )}
            </div>

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
                        <Button
                            onClick={() => { setShowFillModal(false); router.push(`/profile/edit?returnUrl=${encodeURIComponent(jobDetailUrl)}`); }}
                            className="bg-primary"
                        >
                            Jít na profil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showCheckModal} onOpenChange={(open) => { setShowCheckModal(open); if (!open) setIsDisabled(false); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Máš zájem o tuto nabídku?</DialogTitle>
                        <DialogDescription className="mt-2">
                            {jobUrl
                                ? "Zájem odešleme zaměstnavateli a otevřeme stránku nabídky, kde se přihlásíš přímo."
                                : "Odešleme tvůj profil s kontaktními údaji, aby se s tebou mohl zaměstnavatel spojit."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col-reverse sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            onClick={() => { setShowCheckModal(false); router.push(`/profile/edit?returnUrl=${encodeURIComponent(jobDetailUrl)}`); }}
                        >
                            ZKONTROLOVAT PROFIL
                        </Button>
                        <Button
                            onClick={() => {
                                setIsDisabled(true);
                                if (jobUrl) {
                                    const popup = window.open("about:blank", "_blank");
                                    if (popup) popup.opener = null;
                                    pendingPopupRef.current = popup;
                                }
                                applyMutation.mutate();
                            }}
                            className="bg-primary"
                            disabled={applyMutation.isPending}
                        >
                            ANO, MÁM ZÁJEM
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
