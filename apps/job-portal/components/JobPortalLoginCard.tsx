"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader } from "lucide-react";
import API from "../lib/legacyApi";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@ui/hooks/use-toast";
import { API_KEYS } from "@ui/types/api_keys";
import { Button } from "@ui/components/core/button";
import { Card, CardContent, CardHeader } from "@ui/components/core/card";
import { Input } from "@ui/components/core/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@ui/components/core/input-otp";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@ui/components/core/select";
import { Toaster } from "@ui/components/core/toaster";
import { getAuthToken, removeAuthToken, setAuthToken } from "../lib/constants";
import { normalizeApiError, is5xx, FIVE_XX_USER_MESSAGE } from "../lib/apiErrors";
import type { StoredAuthToken } from "../lib/authSession";
import { getPendingJobAction, clearPendingJobAction, type PendingJobAction } from "../lib/utils";
import { reportError } from "../lib/reportError";
import { fetchProfile } from "../lib/migratedQueries";
import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";

const LINK_EMPLOYER_INFO = "https://www.quickjobs.cz/";
const LINK_PRIVACY_POLICY = "https://www.quickjobs.cz/ochrana-osobnich-udaju";
const LINK_TERM_OF_TRADE =
    "https://quickjobs.cz/obchodni-podminky?_gl=1*n4ni7h*_gcl_au*MzE3NTUzOTUxLjE3Mzg1MjE1MTk.*_ga*MTkyMTk4MTIxNC4xNzM4Mjc2OTg4*_ga_6N0H7F4RH7*MTczODUyNzQ3Ny4yLjEuMTczODUyNzcwOS4wLjAuMA..*_ga_Q1272S8FZN*MTczODUyNzQ3Ny4yLjEuMTczODUyNzcwOS42MC4wLjA.";
const defaultCountryCode = "+420";

const phoneSchema = z.object({
    phone: z
        .string()
        .min(9, "Neplatné telefonní číslo")
        .max(15, "Neplatné telefonní číslo"),
    countryCode: z.string().min(1, "Musíte vybrat kód země"),
});

const registrationSchema = z.object({
    givenName: z.string().min(1, "Jméno je povinné"),
    familyName: z.string().min(1, "Příjmení nebo název společnosti je povinné"),
    email: z.string().email("Neplatný e-mail").min(1, "E-mail je povinný"),
    howDidYouHearAboutUs: z.string().min(1, "Jak jste se o nás dozvěděli?"),
});

type PhoneFormType = {
    phone: string;
    countryCode: string;
};

type RegistrationFormType = z.infer<typeof registrationSchema>;

type JobPortalLoginCardType = {
    callback: () => void;
    isLoading?: boolean;
    userType?: "employer" | "applicant";
    onBack?: () => void;
    backButtonText?: string;
};

export const JobPortalLoginCard = ({
    callback,
    isLoading,
    userType = "employer",
    onBack,
    backButtonText = "Detail nabídky",
}: JobPortalLoginCardType) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const router = useRouterWithNavigationLoading();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [selectedUserType, setSelectedUserType] = useState<"employer" | "applicant">(userType);

    const executePendingJobAction = async (pendingAction: PendingJobAction, defaultReturnUrl?: string | null): Promise<boolean> => {
        try {
            await API.applications.createApplication(pendingAction.jobId, pendingAction.action);

            // Invalidate queries
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

            // After apply: show congratulations step (hura) on onboarding; after ignore: go to returnUrl
            if (pendingAction.action === "apply") {
                router.push("/onboarding");
            } else {
                const returnUrl = pendingAction.returnUrl || defaultReturnUrl || "/";
                router.push(returnUrl);
            }
            return true; // Indicates we navigated
        } catch (error: any) {
            reportError(error, { location: "JobPortalLoginCard.executePendingJobAction", jobId: pendingAction.jobId });
            console.error("Failed to execute pending job action:", error);

            // Clear pending action even on error to avoid retry loops
            clearPendingJobAction();

            const normalized = normalizeApiError(error);
            const isConflict =
                normalized.status === 409 ||
                error?.message?.includes("409") ||
                error?.message?.includes("already");

            if (isConflict) {
                // User already applied - this is actually fine, just inform them
                toast({
                    title: "Už jsi se k této nabídce přihlásil/a ✅",
                    description: "Tvá přihláška je již odeslaná.",
                    duration: 5000,
                });

                // After apply (409): show congratulations step (hura) on onboarding
                if (pendingAction.action === "apply") {
                    router.push("/onboarding");
                } else {
                    const returnUrl = pendingAction.returnUrl || defaultReturnUrl || "/";
                    router.push(returnUrl);
                }
                return true; // Indicates we navigated
            } else {
                const beCrashed = is5xx(normalized.status);
                toast({
                    title: normalized.isTimeout ? "Vypršel limit čekání" : beCrashed ? "Server není dostupný" : "Chyba při odesílání",
                    description: normalized.isTimeout
                        ? "Odpověď serveru trvala příliš dlouho. Zkus to prosím znovu."
                        : beCrashed
                            ? FIVE_XX_USER_MESSAGE
                            : "Zkus to prosím znovu po přihlášení.",
                    variant: "destructive",
                    duration: 3000,
                });
                return false;
            }
        }
    };

    useEffect(() => {
        setIsMounted(true);

        const urlParams = new URLSearchParams(window.location.search);
        const token = getAuthToken();
        if (token && urlParams.get("forceRegistration") === "true") {
            (async () => {
                try {
                    await API.restoreUserToken(token as any);
                    setStep(2);
                } catch (error) {
                    reportError(error, { location: "JobPortalLoginCard.restoreToken" });
                    console.error("Error restoring token for forced registration:", error);
                    removeAuthToken();
                }
            })();
        }
    }, []);

    const {
        control: phoneControl,
        handleSubmit: handlePhoneSubmit,
        setValue: setPhoneValue,
        formState: { errors: phoneErrors },
    } = useForm<PhoneFormType>({
        resolver: zodResolver(phoneSchema),
        defaultValues: { phone: "", countryCode: defaultCountryCode },
    });

    const {
        control: registrationControl,
        handleSubmit: handleRegistrationSubmit,
        formState: { errors: registrationErrors },
    } = useForm<RegistrationFormType>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            givenName: "",
            familyName: "",
            email: "",
            howDidYouHearAboutUs: "",
        },
    });

    const handleSendCode = async (data: PhoneFormType) => {
        setLoading(true);
        try {
            API.restoreUserToken(null);
            const response = await API.authorization.sendVerification(
                `${data.countryCode}${data.phone}`
            );
            setStep(1);
        } catch (error) {
            reportError(error, { location: "JobPortalLoginCard.handleSendCode" });
            toast({
                title: "Chyba",
                description: "Nepodařilo se odeslat SMS. Zkus to prosím znovu.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (verificationCode: string) => {
        setLoading(true);
        try {
            const phoneData = phoneControl._formValues;
            const data = await API.authorization.login({
                grantType: "phone",
                phone: phoneData.countryCode + phoneData.phone,
                verificationCode,
                scope: "user_identity",
            });
            // Safely store the token with validation
            if (!setAuthToken(data)) {
                toast({
                    title: "Chyba",
                    description: "Nepodařilo se uložit přihlašovací údaje. Zkus to prosím znovu.",
                    variant: "destructive",
                });
                return;
            }

            // Check for pending job action
            const pendingAction = getPendingJobAction();

            // Get returnUrl from URL search params
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get("returnUrl")
                ? decodeURIComponent(urlParams.get("returnUrl")!)
                : null;

            try {
                const profile = await fetchProfile({ token: data as StoredAuthToken });
                const user = profile.data;
                const hasEmail = user.email && user.email.length > 0;

                if (!hasEmail) {
                    window.location.href = "/onboarding";
                } else if (pendingAction) {
                    const navigated = await executePendingJobAction(pendingAction, returnUrl);
                    if (!navigated) {
                        callback();
                    }
                } else {
                    callback();
                }
            } catch {
                window.location.href = "/onboarding";
            }
        } catch (error) {
            reportError(error, { location: "JobPortalLoginCard.handleVerifyCode.login" });
            toast({
                title: "Chyba",
                description: "Zadal/a jsi špatný kód nebo došlo k chybě.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRegistration = async (data: RegistrationFormType) => {
        setLoading(true);
        try {
            const profileData: any = {
                user_source: data.howDidYouHearAboutUs,
            };

            if (data.givenName && data.givenName.trim()) {
                profileData.givenName = data.givenName;
            }

            if (data.familyName && data.familyName.trim()) {
                profileData.familyName = data.familyName;
            }

            if (data.email && data.email.trim()) {
                profileData.email = data.email;
            }

            // Set role based on selected user type
            profileData.roles = selectedUserType === "employer" ? ["employer"] : ["applicant"];

            const formData = new FormData();
            const response = await fetch("/images/placeholder.png");
            const blob = await response.blob();
            formData.append("image", blob, "placeholder.png");
            formData.append("imageType", "face");
            await fetch(`/api/upload/face`, {
                method: "POST",
                body: formData,
            });
            await API.users.updateProfile(profileData);

            await queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            await queryClient.refetchQueries({ queryKey: [API_KEYS.PROFILE] });

            await new Promise((resolve) => setTimeout(resolve, 100));

            // After basic registration, redirect to full onboarding
            window.location.href = "/onboarding";
        } catch (error) {
            console.error("Registration error:", error);
            toast({
                title: "Chyba registrace",
                description: "Nepodařilo se dokončit registraci. Zkus to prosím znovu.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 0:
                return (
                    <form
                        onSubmit={handlePhoneSubmit(handleSendCode)}
                        className="space-y-4 relative py-2"
                    >
                        <p className="text-red-500 text-xs absolute right-0 top-0">
                            {phoneErrors.phone ? phoneErrors.phone.message : " "}
                        </p>
                        <div className="flex flex-row gap-[10px] relative">
                            <Controller
                                name="countryCode"
                                control={phoneControl}
                                render={({ field }) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            setPhoneValue("countryCode", value);
                                        }}
                                    >
                                        <SelectTrigger className="w-[100px]">
                                            {field.value}
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="+420">+420</SelectItem>
                                            <SelectItem value="+421">+421</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            <Controller
                                name="phone"
                                control={phoneControl}
                                render={({ field }) => (
                                    <Input
                                        className="flex-1"
                                        type="tel"
                                        placeholder="Zadejte tel. číslo"
                                        wrapperProps={{ className: "flex-1" }}
                                        {...field}
                                        onChange={(e) =>
                                            field.onChange(e.target.value.replace(/\s/g, ""))
                                        }
                                    />
                                )}
                            />
                        </div>
                        <p className="text-sm text-gray-500 text-center">
                            Tel. číslo slouží k přihlášení a spojení s zaměstnavateli v rámci služby QuickJOBS.
                        </p>
                        <Button
                            type="submit"
                            className="mt-4 w-full uppercase"
                            disabled={loading}
                        >
                            {loading ? "Odesílání..." : "Přihlásit / Registrovat"}
                        </Button>
                        <p className="text-sm text-gray-500 text-center mt-2">
                            Přihlášením souhlasíte s{" "}
                            <a
                                href={LINK_TERM_OF_TRADE}
                                className="text-emerald-500"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                obchodními podmínkami
                            </a>{" "}
                            a s{" "}
                            <a
                                href={LINK_PRIVACY_POLICY}
                                className="text-emerald-500"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                poskytnutím a zpracováním osobních údajů
                            </a>
                            .
                        </p>
                    </form>
                );
            case 1:
                if (loading) {
                    return (
                        <div className="flex flex-col items-center justify-center py-10 gap-4">
                            <Loader className="animate-spin h-8 w-8 text-emerald-500" />
                            <p className="text-sm text-gray-500">Přihlašujeme tě...</p>
                        </div>
                    );
                }
                return (
                    <div className="flex justify-center flex-col items-center text-center">
                        <p className="text-xs sm:text-sm text-gray-500 mb-4 w-full">
                            SMS jsme vám zaslali na číslo
                            <br className="sm:hidden" />
                            <span className="whitespace-nowrap font-medium block sm:inline mt-0.5 sm:mt-0">
                                {`${phoneControl._formValues.countryCode} ${phoneControl._formValues.phone.replace(/(\d{3})(?=\d)/g, "$1 ")}`}
                            </span>
                        </p>
                        <InputOTP maxLength={4} onComplete={handleVerifyCode}>
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                            </InputOTPGroup>
                        </InputOTP>
                        <Button
                            className="mt-4 w-full uppercase"
                            disabled={loading}
                            onClick={handlePhoneSubmit(handleSendCode)}
                        >
                            {loading ? "Ověřování..." : "Pokračovat"}
                        </Button>
                        <p className="text-xs sm:text-sm text-gray-500 mt-2 text-center">
                            Nepřišel vám kód?{" "}
                            <button
                                className="text-emerald-500"
                                onClick={handlePhoneSubmit(handleSendCode)}
                            >
                                Odeslat SMS znovu
                            </button>
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 text-center">
                            Zadali jste špatně tel. číslo?{" "}
                            <button className="text-emerald-500" onClick={() => setStep(0)}>
                                Začít znovu
                            </button>
                        </p>
                    </div>
                );
            case 2:
                return (
                    <form
                        onSubmit={handleRegistrationSubmit(handleRegistration)}
                        className="space-y-4"
                    >
                        <Controller
                            name="givenName"
                            control={registrationControl}
                            render={({ field }) => (
                                <Input placeholder="Vaše jméno" {...field} className="mt-6" />
                            )}
                        />
                        {registrationErrors.givenName && (
                            <p className="text-red-500 text-xs">
                                {registrationErrors.givenName.message}
                            </p>
                        )}
                        <Controller
                            name="familyName"
                            control={registrationControl}
                            render={({ field }) => (
                                <Input placeholder="Příjmení/Název společnosti" {...field} />
                            )}
                        />
                        {registrationErrors.familyName && (
                            <p className="text-red-500 text-xs">
                                {registrationErrors.familyName.message}
                            </p>
                        )}
                        <Controller
                            name="email"
                            control={registrationControl}
                            render={({ field }) => (
                                <Input placeholder="Pracovní email" {...field} />
                            )}
                        />

                        {registrationErrors.email && (
                            <p className="text-red-500 text-xs">
                                {registrationErrors.email.message}
                            </p>
                        )}
                        <Controller
                            name="howDidYouHearAboutUs"
                            control={registrationControl}
                            render={({ field }) => (
                                <Input
                                    placeholder="Jak jste se o nás dozvěděli?"
                                    {...field}
                                    className="mb-6"
                                />
                            )}
                        />
                        <Button
                            type="submit"
                            className="w-full uppercase"
                            disabled={loading}
                        >
                            {loading ? "Dokončování..." : "Dokončit registraci"}
                        </Button>
                    </form>
                );
            default:
                return null;
        }
    };

    const getTitle = () => {
        switch (step) {
            case 0:
                return "PRO UCHAZEČE";
            case 1:
                return "Opiš kód z SMS";
            case 2:
                return "Dokončete svou registraci";
            default:
                return "";
        }
    };

    const getSubtitle = () => {
        if (step === 0) return "Zadej své telefonní číslo, aby se s tebou mohl zaměstnavatel spojit";
        return "";
    };

    return (
        <div className="flex flex-col items-center justify-center top-[20px]">
            {isMounted && <Toaster />}
            <Card className="w-full max-w-md p-3 sm:p-6 shadow-md z-10">
                {isLoading ? (
                    <div className="flex justify-center items-center w-[398px] h-[370px]">
                        <Loader className="animate-spin" />
                    </div>
                ) : (
                    <>
                        <CardHeader className="pb-0">
                            <h1 className="text-2xl font-bold text-center">{getTitle()}</h1>
                            <p className="text-center text-sm text-gray-500">
                                {getSubtitle()}
                            </p>
                        </CardHeader>
                        <CardContent>{renderStepContent()}</CardContent>
                    </>
                )}
            </Card>
            <a
                href={LINK_EMPLOYER_INFO}
                className="text-md text-gray-500 mt-4 mb-8 underline text-center block"
                target="_blank"
                rel="noopener noreferrer"
            >
                <b>JSTE ZAMĚSTNAVATEL ?</b> <br /> Zjištete, jak můžete oslovit studenty a absolventy.
            </a>
        </div>
    );
};
