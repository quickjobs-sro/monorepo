"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";
import { useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import API, { NOTIFICATION_TRIGGER } from "../../../lib/legacyApi";
import { updateProfileViaApi } from "../../../lib/api";
import { useGetProfile } from "../../../hooks/useGetProfile";
import { useToast } from "@ui/hooks/use-toast";
import { ProfileImageManager, type ProfileImage } from "@ui/components/profile/ProfileImageManager";
import { BirthDatePicker } from "@ui/components/core/BirthDatePicker";
import { Button } from "@ui/components/core/button";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import { Switch } from "@ui/components/core/switch";
import { Textarea } from "@ui/components/core/textarea";
import { Skeleton } from "@ui/components/core/skeleton";
import { API_KEYS } from "@ui/types/api_keys";
import { getAuthToken, removeAuthToken, isValidToken } from "../../../lib/constants";
import { useTokenRestore } from "../../../components/TokenRestoreProvider";
import { Header } from "../../../components/Header";
import { Loader2, Lock, UserX, ChevronLeft, MapPin, Plus, Edit2, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@ui/components/core/dialog";
import { LocationPickerModal } from "../../../components/modals/LocationPickerModal";
import { JobTypeBadges, type JobTypeKey } from "../../../components/JobTypeBadges";
import { reportError } from "../../../lib/reportError";
import { getSubscribedJobTypes } from "../../../lib/subscribedJobTypes";

const profileSchema = z.object({
    givenName: z.string().min(1, "Jméno je povinné"),
    familyName: z.string().min(1, "Příjmení je povinné"),
    email: z.string().email("Neplatný formát emailu"),
    description: z.string().max(400, "Popis může mít maximálně 400 znaků").optional(),
    birthDate: z.date().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function EditProfilePageContent() {
    const router = useRouterWithNavigationLoading();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { mounted, tokenRestored } = useTokenRestore();
    const token = getAuthToken();
    const hasValidToken = mounted && tokenRestored && !!token && isValidToken(token);
    const { data: userProfile, isLoading: profileLoading, refetch } = useGetProfile(!!hasValidToken);
    const [hideProfile, setHideProfile] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteReason, setDeleteReason] = useState("");
    const [deleteReasonError, setDeleteReasonError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showLocationDialog, setShowLocationDialog] = useState(false);
    const [editingAreaId, setEditingAreaId] = useState<number | undefined>(undefined);
    const [togglingJobType, setTogglingJobType] = useState<JobTypeKey | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
        setValue,
        watch,
        reset,
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        mode: "onBlur",
        defaultValues: {
            givenName: "",
            familyName: "",
            email: "",
            description: "",
            birthDate: undefined,
        },
    });

    const description = watch("description");

    // #region agent log – profile edit stuck (description)
    const logEdit = (_message: string, _data: Record<string, unknown>) => {
        // no-op after removing debug logging
    };
    // #endregion
    const PROFILE_UPDATE_TIMEOUT_MS = 25_000;
    const [initialHideProfile, setInitialHideProfile] = useState<boolean | null>(null);

    // Initialize form when userData loads
    useEffect(() => {
        if (userProfile?.data) {
            const data = userProfile.data;
            const initialHideProfileValue = (data as any).hideProfile || false;
            // #region agent log
            logEdit("form reset from profile", { descriptionLength: (data as any).description?.length ?? 0 });
            // #endregion
            // Use reset to properly set default values for isDirty tracking
            reset({
                givenName: data.givenName || "",
                familyName: data.familyName || "",
                email: data.email || "",
                description: data.description || "",
                birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
            }, { keepDefaultValues: false });
            
            setHideProfile(initialHideProfileValue);
            setInitialHideProfile(initialHideProfileValue);
        }
    }, [userProfile?.data, reset]);

    // Check if hideProfile has changed
    const hideProfileChanged = initialHideProfile !== null && hideProfile !== initialHideProfile;
    
    // Combined dirty check: form changes OR hideProfile changes
    const hasUnsavedChanges = isDirty || hideProfileChanged;

    // Open location modal when arriving with ?open=location
    useEffect(() => {
        if (searchParams.get("open") === "location") {
            setEditingAreaId(undefined);
            setShowLocationDialog(true);
            router.replace("/profile/edit", { scroll: false });
        }
    }, [searchParams, router]);

    // Scroll to job types section when arriving with #job-types
    useEffect(() => {
        if (typeof window === "undefined" || window.location.hash !== "#job-types") return;
        const el = document.getElementById("job-types");
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            window.history.replaceState(null, "", "/profile/edit");
        }
    }, [userProfile?.data]);

    // Scroll to location section when arriving with #lokace (e.g. from "Filtr lokace" on jobs list)
    useEffect(() => {
        if (typeof window === "undefined" || window.location.hash !== "#lokace") return;
        const el = document.getElementById("lokace");
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            window.history.replaceState(null, "", "/profile/edit");
        }
    }, [userProfile?.data]);

    // Warn user about unsaved changes when navigating away
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    const finalDisplayImages: ProfileImage[] = useMemo(() => {
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
                alt: "Nahrát hlavní obrázek",
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
                id: "optional1-placeholder",
                url: "",
                alt: "Nahrát doplňkový obrázek",
                isMain: false,
            });
        }
        return images;
    }, [userProfile?.data]);

    const onSubmit = async (data: ProfileFormData) => {
        if (isSaving) return;

        setIsSaving(true);
        // #region agent log
        logEdit("submit start", { hasDescription: !!data.description });
        // #endregion
        const doUpdate = async (): Promise<void> => {
            const updatePromise = API.users.updateProfile({
                givenName: data.givenName,
                familyName: data.familyName,
                email: data.email,
                description: data.description || null,
                birthDate: data.birthDate ? format(data.birthDate, "yyyy-MM-dd") : null,
            });
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Profile update timeout")), PROFILE_UPDATE_TIMEOUT_MS)
            );
            await Promise.race([updatePromise, timeoutPromise]);
        };

        try {
            // #region agent log
            logEdit("updateProfile call", {});
            // #endregion
            try {
                await doUpdate();
            } catch (firstErr) {
                const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
                const isRetryable = msg === "Profile update timeout" || msg === "Network request failed";
                if (isRetryable) {
                    await new Promise((r) => setTimeout(r, 2000));
                    await doUpdate();
                } else {
                    throw firstErr;
                }
            }
            // #region agent log
            logEdit("updateProfile done", {});
            // #endregion

            const REFETCH_TIMEOUT_MS = 15_000;
            try {
                await Promise.race([
                    refetch(),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error("Profile refetch timeout")), REFETCH_TIMEOUT_MS)
                    ),
                ]);
            } catch (_refetchErr) {
                // Refetch slow/failed; still consider save successful, invalidate so next nav gets fresh data
            }
            // #region agent log
            logEdit("refetch done", {});
            // #endregion
            queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });

            // Update initial hideProfile value after successful save
            setInitialHideProfile(hideProfile);

            toast({
                title: "Úspěch",
                description: "Profil byl úspěšně aktualizován.",
            });
            // #region agent log
            logEdit("router.back call", {});
            // #endregion
            // Stay on profile edit; reset form so it is no longer dirty
            reset(data, { keepDefaultValues: false });
        } catch (error) {
            // #region agent log
            logEdit("submit error", { error: error instanceof Error ? error.message : String(error) });
            // #endregion
            reportError(error, { location: "ProfileEditPage.submit" });
            console.error("Error updating profile:", error);
            const msg = error instanceof Error ? error.message : String(error);
            const description =
                msg === "Profile update timeout"
                    ? "Spojení vypršelo. Zkus to prosím znovu."
                    : msg === "Network request failed"
                      ? "Chyba sítě. Zkontroluj připojení a zkus to znovu."
                      : "Nepodařilo se aktualizovat profil. Zkus to prosím znovu.";
            toast({
                title: "Chyba",
                description,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleHideProfileToggle = async (checked: boolean) => {
        setHideProfile(checked);
        try {
            await API.users.updateProfile({
                hide_profile: checked,
            });
            await refetch();
            queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            // Update initial value after successful save
            setInitialHideProfile(checked);
        } catch (error) {
            console.error("Error updating hide profile:", error);
            setHideProfile(!checked);
            toast({
                title: "Chyba",
                description: "Nepodařilo se aktualizovat nastavení.",
                variant: "destructive",
            });
        }
    };

    const handleLogout = async () => {
        if (token) {
            try {
                await API.authorization.logout(true);
            } catch (error) {
                console.error("Error during logout:", error);
            }
        }
        removeAuthToken();
        queryClient.clear();
        window.location.href = "/";
    };

    const handleDeleteAccount = async () => {
        if (isDeleting) return;

        const trimmedReason = deleteReason.trim();
        if (trimmedReason.length < 20) {
            setDeleteReasonError("Důvod musí mít minimálně 20 znaků");
            return;
        }
        if (trimmedReason.length > 200) {
            setDeleteReasonError("Důvod může mít maximálně 200 znaků");
            return;
        }

        setDeleteReasonError(null);
        setIsDeleting(true);

        // Clear all queries immediately to prevent redundant API calls
        queryClient.cancelQueries();
        queryClient.clear();

        try {
            // First delete account on server (while token is still valid)
            await API.users.removeProfile(trimmedReason);
        } catch (error) {
            console.error("Error deleting account:", error);
            setIsDeleting(false);
            toast({
                title: "Chyba",
                description: "Nepodařilo se smazat účet. Zkus to prosím znovu.",
                variant: "destructive",
            });
            return;
        }

        // Account deleted successfully, now cleanup and logout
        try {
            handleLogout();
            // Try to logout (non-blocking, account might already be deleted)
            if (token) {
                API.authorization.logout(true).catch((apiError) => {
                    // Token might already be invalid after account deletion, ignore
                    console.error("Error during logout:", apiError);
                });
            }
        } catch (error) {
            console.error("Error during logout:", error);
            // Continue with cleanup even if logout fails
        }

        // Always cleanup local state and redirect, even if logout fails
        removeAuthToken();
        queryClient.clear();

        // Use replace instead of href to prevent back button issues
        window.location.replace("/");
    };

    const handleHideProfileFromDeleteDialog = async () => {
        setShowDeleteDialog(false);
        setDeleteReason("");
        setDeleteReasonError(null);
        await handleHideProfileToggle(true);
    };

    const handleAddLocation = () => {
        setEditingAreaId(undefined);
        setShowLocationDialog(true);
    };

    const handleEditLocation = (areaId: number) => {
        setEditingAreaId(areaId);
        setShowLocationDialog(true);
    };

    const handleDeleteLocation = async (areaId: number) => {
        try {
            await (API.users as any).removeArea(areaId);
            await refetch();
            queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS] });
            toast({
                title: "Úspěch",
                description: "Lokace byla odstraněna",
            });
        } catch (error) {
            console.error("Error deleting area:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se odstranit lokaci. Zkus to prosím znovu.",
                variant: "destructive",
            });
        }
    };

    const handleLocationSuccess = async () => {
        await refetch();
        queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
    };

    const areas = userProfile?.data?.areas || [];
    const editingArea = editingAreaId ? areas.find((a: any) => a.id === editingAreaId) : undefined;

    const subscribedJobTypes = useMemo(
        () => getSubscribedJobTypes(userProfile?.data?.subscribedNotifications),
        [userProfile?.data?.subscribedNotifications]
    );
    const activeOneTime = subscribedJobTypes.includes("newOneTimeJobs");
    const activeLongTerm = subscribedJobTypes.includes("newLongTermJobs");
    const activeFulltime = subscribedJobTypes.includes("newFullTimeJobs");

    const handleToggleJobType = async (type: JobTypeKey) => {
        if (togglingJobType) return;
        const current =
            type === "oneTime" ? activeOneTime : type === "longTerm" ? activeLongTerm : activeFulltime;
        const next = !current;
        const activeCount = [activeOneTime, activeLongTerm, activeFulltime].filter(Boolean).length;
        if (!next && activeCount <= 1) {
            toast({
                title: "Nastavení",
                description: "Min. 1 typ nabídky musí být zapnutý.",
                variant: "destructive",
            });
            return;
        }
        setTogglingJobType(type);
        const trigger =
            type === "oneTime"
                ? NOTIFICATION_TRIGGER.NEW_ONE_TIME_JOBS
                : type === "longTerm"
                    ? NOTIFICATION_TRIGGER.NEW_LONG_TERM_JOBS
                    : NOTIFICATION_TRIGGER.NEW_FULL_TIME_JOBS;
        const action = next ? "+phone" : "-phone";
        const payload = { subscribedNotifications: { [trigger]: [action] } };
        try {
            await updateProfileViaApi(payload);
            await refetch();
            queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS] });
        } catch (error) {
            console.error("Error updating notification preferences:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se uložit nastavení. Zkus to prosím znovu.",
                variant: "destructive",
            });
        } finally {
            setTogglingJobType(null);
        }
    };

    if (!mounted || !tokenRestored || profileLoading) {
        return (
            <div className="container mx-auto p-4 lg:p-8 space-y-8">
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        );
    }

    if (!userProfile?.data) {
        return (
            <div className="container mx-auto p-4 text-center">
                <p className="text-red-500 mb-4">Chyba při načítání profilu.</p>
                <Button onClick={() => router.back()}>Zpět</Button>
            </div>
        );
    }

    return (
        <>
            <Suspense fallback={<div className="fixed top-0 left-0 right-0 w-full bg-white border-b border-gray-200 py-4 h-20"></div>}>
                <Header />
            </Suspense>
            <main className="mx-auto px-6 md:px-16 max-w-full pt-4 md:pt-36">
                <div className="container mx-auto p-4 lg:p-8 space-y-8 max-w-4xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    if (hasUnsavedChanges) {
                                        const confirmed = window.confirm(
                                            "Máš neuložené změny. Opravdu chceš opustit stránku bez uložení?"
                                        );
                                        if (confirmed) {
                                            router.back();
                                        }
                                    } else {
                                        router.back();
                                    }
                                }}
                                className="h-8 w-8"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <h1 className="text-2xl font-semibold">Upravit profil</h1>
                        </div>
                    </div>

                    {/* Profile Images */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4">Profilové fotografie</h2>
                        <ProfileImageManager initialImages={finalDisplayImages} />
                    </section>

                    {/* Profile Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="givenName">Jméno *</Label>
                                <Controller
                                    control={control}
                                    name="givenName"
                                    render={({ field }) => (
                                        <Input
                                            id="givenName"
                                            {...field}
                                            className={errors.givenName ? "border-red-500" : ""}
                                        />
                                    )}
                                />
                                {errors.givenName && (
                                    <p className="text-sm text-red-500">{errors.givenName.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="familyName">Příjmení *</Label>
                                <Controller
                                    control={control}
                                    name="familyName"
                                    render={({ field }) => (
                                        <Input
                                            id="familyName"
                                            {...field}
                                            className={errors.familyName ? "border-red-500" : ""}
                                        />
                                    )}
                                />
                                {errors.familyName && (
                                    <p className="text-sm text-red-500">{errors.familyName.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Controller
                                control={control}
                                name="email"
                                render={({ field }) => (
                                    <Input
                                        id="email"
                                        type="email"
                                        {...field}
                                        className={errors.email ? "border-red-500" : ""}
                                    />
                                )}
                            />
                            {errors.email && (
                                <p className="text-sm text-red-500">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Popis</Label>
                            <Controller
                                control={control}
                                name="description"
                                render={({ field }) => (
                                    <Textarea
                                        id="description"
                                        {...field}
                                        rows={4}
                                        maxLength={400}
                                        className={errors.description ? "border-red-500" : ""}
                                    />
                                )}
                            />
                            <div className="flex justify-between">
                                {errors.description && (
                                    <p className="text-sm text-red-500">{errors.description.message}</p>
                                )}
                                <p className="text-sm text-gray-500 ml-auto">
                                    {description?.length || 0} / 400
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="birthDate">Datum narození</Label>
                            <Controller
                                control={control}
                                name="birthDate"
                                render={({ field }) => (
                                    <BirthDatePicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Vyber datum narození"
                                        minAge={15}
                                    />
                                )}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefon</Label>
                            <div className="relative">
                                <Input
                                    id="phone"
                                    value={userProfile.data.phone || ""}
                                    disabled
                                    className="pr-10"
                                />
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500">
                                Pro změnu telefonního čísla nás kontaktujte na info@quickjobs.cz
                            </p>
                        </div>

                        {/* Hide Profile Toggle */}
                        <div className="border-2 border-green-500 rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold mb-2">
                                        {hideProfile ? "Tvůj účet je skrytý" : "Tvůj účet je veřejný"}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Skrytím profilu tě nebudou moct zaměstnavatelé vyhledat v databázi.
                                        Tvůj profil uvidí pouze ti zaměstnavatelé, na jejichž pracovní
                                        nabídku jsi projevil/a zájem.
                                    </p>
                                </div>
                                <Switch
                                    checked={!hideProfile}
                                    onCheckedChange={(checked) => handleHideProfileToggle(!checked)}
                                />
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end gap-4">
                            <Button
                                type="submit"
                                disabled={!hasUnsavedChanges || isSaving}
                                className="min-w-[120px]"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Ukládám...
                                    </>
                                ) : (
                                    "Uložit změny"
                                )}
                            </Button>
                        </div>
                    </form>

                    {/* Zajímají mě - typy nabídek pro notifikace (mimo formulář, aby byly badge klikatelné) */}
                    <section id="job-types" className="border rounded-lg p-4 space-y-3 scroll-mt-24">
                        <JobTypeBadges
                            variant="editable"
                            activeOneTime={activeOneTime}
                            activeLongTerm={activeLongTerm}
                            activeFulltime={activeFulltime}
                            onToggle={handleToggleJobType}
                            togglingType={togglingJobType}
                            disableToggleOffWhenLast
                        />
                        <p className="text-sm text-gray-500">
                            Kliknutím na badge zapneš nebo vypneš notifikace pro daný typ (telefon). Min. 1 typ musí být zapnutý.
                        </p>
                    </section>

                    {/* Areas Section */}
                    <section id="lokace" className="border-t pt-6 scroll-mt-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Lokace</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddLocation}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Přidat lokaci
                            </Button>
                        </div>
                        {areas.length === 0 ? (
                            <p className="text-sm text-gray-500 mb-4">
                                Nemáš nastavenou žádnou lokaci. Přidej lokaci, aby tě zaměstnavatelé mohli najít.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {areas.map((area: any) => (
                                    <div
                                        key={area.id}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <MapPin className="h-4 w-4 text-gray-500" />
                                                <p className="font-medium">{area.place?.address || "Neznámá adresa"}</p>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                Rozsah: {area.radius ? `${(area.radius / 1000).toFixed(0)} km` : "Neznámý"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditLocation(area.id)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteLocation(area.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Logout Button */}
                    <div className="border-t pt-6">
                        <Button
                            variant="destructive"
                            onClick={() => setShowLogoutDialog(true)}
                            className="w-full"
                        >
                            Odhlásit se
                        </Button>
                    </div>

                    {/* Delete Account */}
                    {/* <div className="border-2 border-red-500 rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold uppercase text-red-600">Nebezpečná zóna</h3>
                        <p className="text-sm text-gray-600">
                            Smazáním svého účtu ztratíš důležitou historii a svá hodnocení. <strong>Firmy tě
                            také nebudou moci vyhledat v databázi a nabídnout ti zajímavou práci.</strong>
                        </p>
                        <Button
                            variant="destructive"
                            onClick={() => setShowDeleteDialog(true)}
                            className="w-full"
                        >
                            <UserX className="mr-2 h-4 w-4" />
                            Smazat účet
                        </Button>
                    </div> */}

                    {/* Dialogs */}
                    <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Odhlášení</DialogTitle>
                                <DialogDescription>Chcete se odhlásit?</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowLogoutDialog(false)}
                                >
                                    Zrušit
                                </Button>
                                <Button
                                    variant="default"
                                    onClick={handleLogout}
                                >
                                    Odhlásit
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={showDeleteDialog}
                        onOpenChange={(open) => {
                            setShowDeleteDialog(open);
                            if (!open) {
                                setDeleteReason("");
                                setDeleteReasonError(null);
                            }
                        }}
                    >
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Smazat účet</DialogTitle>
                                <DialogDescription>
                                    Opravdu chcete smazat svůj účet? Tato akce je nevratná.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 py-4">
                                <Label htmlFor="deleteReason">
                                    Důvod smazání účtu
                                </Label>
                                <Textarea
                                    id="deleteReason"
                                    value={deleteReason}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value.length <= 200) {
                                            setDeleteReason(value);
                                            if (deleteReasonError) {
                                                const trimmed = value.trim();
                                                if (trimmed.length >= 20 && trimmed.length <= 200) {
                                                    setDeleteReasonError(null);
                                                }
                                            }
                                        }
                                    }}
                                    placeholder="Napište prosím důvod, proč si přejete smazat účet..."
                                    rows={4}
                                    maxLength={200}
                                    className={deleteReasonError ? "border-red-500 resize-none" : "resize-none"}
                                />
                                {deleteReasonError && (
                                    <p className="text-sm text-red-500">{deleteReasonError}</p>
                                )}
                                <p className="text-sm text-gray-500">
                                    {deleteReason.trim().length} / 200 znaků
                                </p>
                            </div>
                            <DialogFooter className="flex-col sm:flex-row gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleHideProfileFromDeleteDialog}
                                    disabled={isDeleting}
                                    className="w-full sm:w-auto"
                                >
                                    Skrýt profil místo toho
                                </Button>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setShowDeleteDialog(false);
                                            setDeleteReason("");
                                            setDeleteReasonError(null);
                                        }}
                                        disabled={isDeleting}
                                        className="flex-1 sm:flex-initial"
                                    >
                                        Zrušit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeleteAccount}
                                        disabled={isDeleting || deleteReason.trim().length < 20}
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Mažu...
                                            </>
                                        ) : (
                                            "Smazat účet"
                                        )}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Location Picker Dialog */}
                    <LocationPickerModal
                        isOpen={showLocationDialog}
                        onClose={() => {
                            setShowLocationDialog(false);
                            setEditingAreaId(undefined);
                        }}
                        initialLocation={editingArea ? {
                            latitude: editingArea.place?.latitude || 50.0755,
                            longitude: editingArea.place?.longitude || 14.4378,
                            address: editingArea.place?.address || "",
                        } : undefined}
                        initialRadius={editingArea?.radius || 25000}
                        areaId={editingAreaId}
                        onSuccess={handleLocationSuccess}
                    />
                </div>
            </main>
        </>
    );
}

const editProfileFallback = (
    <>
        <Header />
        <main className="mx-auto px-4 sm:px-6 md:px-8 lg:px-16 pt-4 sm:pt-24 md:pt-32 lg:pt-36 max-w-7xl">
            <div className="mx-auto p-4 sm:p-6 md:p-8 space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        </main>
    </>
);

export default function EditProfilePage() {
    return (
        <Suspense fallback={editProfileFallback}>
            <EditProfilePageContent />
        </Suspense>
    );
}
