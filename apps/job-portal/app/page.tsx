"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Suspense, useState, useEffect } from "react";
import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { updateProfileViaApi } from "../lib/api";
import { useGetProfile } from "../hooks/useGetProfile";
import { useToast } from "@ui/hooks/use-toast";
import { getAuthToken, isValidToken, removeAuthToken } from "../lib/constants";
import { useTokenRestore } from "../components/TokenRestoreProvider";
import { Header } from "../components/Header";
import { ProfilePreview } from "../components/ProfilePreview";
import { Switch } from "@ui/components/core/switch";
import { Button } from "@ui/components/core/button";
import { API_KEYS } from "@ui/types/api_keys";
import type { JobTypeKey } from "../components/JobTypeBadges";
import { Skeleton } from "@ui/components/core/skeleton";
import { cn } from "@ui/lib/utils";
import API, { NOTIFICATION_TRIGGER } from "../lib/legacyApi";
import { getSubscribedJobTypes } from "../lib/subscribedJobTypes";

const SchoolModal = dynamic(
    () => import("../components/modals/SchoolModal").then((m) => ({ default: m.SchoolModal })),
    { ssr: false }
);
const SkillsModal = dynamic(
    () => import("../components/modals/SkillsModal").then((m) => ({ default: m.SkillsModal })),
    { ssr: false }
);
const ExperienceModal = dynamic(
    () => import("../components/modals/ExperienceModal").then((m) => ({ default: m.ExperienceModal })),
    { ssr: false }
);

const LazyProfilePreview = dynamic(
    () => import("../components/ProfilePreview").then((m) => ({ default: m.ProfilePreview })),
    { loading: () => <Skeleton className="h-64 w-full rounded-lg" />, ssr: false }
);

const WIX_MEDIA = "https://static.wixstatic.com/media";
const COMPANY_LOGO_IDS = [
    "25e830_56af7e58e1734daaa03e664e7b3b0be0~mv2.png",
    "c102b1_5958b0aafb664e1193c085d25ca43e39~mv2.png",
    "c102b1_9b3dc2e9792c45bdb44db7de4b712758~mv2.png",
    "c102b1_e82dec60a14f4bc9a5711b3697f6699e~mv2.png",
    "c102b1_74c98d23fad24262b0898ceb29b7df19~mv2.png",
    "c102b1_657608db99ed48b9a234e3b530cda08a~mv2.png",
    "c102b1_87af401f251748119c4474ac9af3547c~mv2.png",
    "c102b1_5bfeb77d1cd946a8844a08bb0200f2d4~mv2.png",
    "c102b1_f0e69430d1fe412abe27e7e7388fcc1d~mv2.png",
    "c102b1_4fe1ab4902474a959273926c275aa740~mv2.png",
    "c102b1_1d65054dafd344289f206bd73dddca00~mv2.png",
    "c102b1_4789eb9ce1754a7fbc0a2e0b289d8968~mv2.png",
    "dcb2bd_746b243bae0b4ea6ac6638e5f75fecd5~mv2.png",
    "dcb2bd_d5ad7cd43bc046af90e4f2ae97bf2801~mv2.png",
    "dcb2bd_82446b44b7e74360957024d3e5b91ee0~mv2.png",
    "dcb2bd_b45413eb03eb43c0ae68b8768f951f85~mv2.png",
    "dcb2bd_e34e0c122a0e4824813bc5e577296945~mv2.png",
    "dcb2bd_286ebd14e86d4bb7bad4884decaf2015~mv2.png",
    "dcb2bd_0acf9e132d964f76b25c3b890e3189c1~mv2.png",
    "dcb2bd_0a626fe39cf64bd6b9d8fd25428ffd76~mv2.png",
    "dcb2bd_697cbd8ca0ca4541a14786fed84e2c9b~mv2.png",
    "dcb2bd_56de0f4c99b943e1bcdc1ebff1b43857~mv2.png",
    "dcb2bd_5d48fa1d49f04f2583ca35165e5be3b4~mv2.png",
    "dcb2bd_db7e21bb594d4babab9c81d37ff1fc21~mv2.png",
    "dcb2bd_55070eb86455486091829c2205375439~mv2.png",
];

export default function ProfilePage() {
    const router = useRouterWithNavigationLoading();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { mounted, tokenRestored, triggerRestore } = useTokenRestore();
    const token = mounted ? getAuthToken() : null;
    const hasValidToken = mounted && tokenRestored && !!token && isValidToken(token);

    const profileFetchEnabled = hasValidToken;

    const { data: userProfile, isLoading: profileLoading, isError: profileError, error: profileQueryError, refetch } = useGetProfile(!!profileFetchEnabled);


    const [showSchoolModal, setShowSchoolModal] = useState(false);
    const [showSkillsModal, setShowSkillsModal] = useState(false);
    const [showExperienceModal, setShowExperienceModal] = useState(false);
    const [hideProfile, setHideProfile] = useState(false);
    const [togglingJobType, setTogglingJobType] = useState<JobTypeKey | null>(null);
    const [isRetryingAuth, setIsRetryingAuth] = useState(false);
    const [profileWaitTimedOut, setProfileWaitTimedOut] = useState(false);

    useEffect(() => {
        if (!(hasValidToken && profileLoading)) {
            setProfileWaitTimedOut(false);
            return;
        }
        const PROFILE_STUCK_MS = 25_000;
        const t = setTimeout(() => {
            setProfileWaitTimedOut(true);
        }, PROFILE_STUCK_MS);
        return () => clearTimeout(t);
    }, [hasValidToken, profileLoading, pathname]);

    useEffect(() => {
        if (userProfile?.data) {
            setHideProfile((userProfile.data as any).hideProfile || false);
        }
    }, [userProfile?.data]);

    const handleSchoolSuccess = async () => {
        await refetch();
        queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
        setShowSchoolModal(false);
    };

    const handleToggleJobType = async (type: JobTypeKey) => {
        if (togglingJobType) return;
        const subs = userProfile?.data?.subscribedNotifications || {};
        const subscribedList = getSubscribedJobTypes(subs);
        const current =
            type === "oneTime"
                ? subscribedList.includes("newOneTimeJobs")
                : type === "longTerm"
                    ? subscribedList.includes("newLongTermJobs")
                    : subscribedList.includes("newFullTimeJobs");
        const next = !current;
        const activeCount = subscribedList.length;
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

    const handleHideProfileToggle = async (checked: boolean) => {
        setHideProfile(checked);
        try {
            await API.users.updateProfile({
                hide_profile: checked,
            });
            await refetch();
            queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
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

    // Don't block on tokenRestored when there's no cookie; only show loading while restoring token or fetching profile.
    const hasTokenInCookie = mounted && !!token;
    const waitingForRestore = hasTokenInCookie && !tokenRestored;
    const waitingForProfile = hasValidToken && (!profileFetchEnabled || profileLoading);
    const showLoading = !mounted || waitingForRestore || waitingForProfile;
    const showLoadingSkeleton = showLoading && !profileWaitTimedOut;

    if (showLoadingSkeleton) {
        return (
            <>
                <Suspense fallback={<div className="fixed top-0 left-0 right-0 w-full bg-white border-b border-gray-200 py-4 h-20"></div>}>
                    <Header />
                </Suspense>
                <main className="mx-auto px-4 sm:px-6 md:px-8 lg:px-16 pt-4 sm:pt-24 md:pt-32 lg:pt-36 max-w-7xl">
                    <div className="mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                        <Skeleton className="h-8 w-48 mb-6" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </main>
            </>
        );
    }

    // Profile fetch failed for logged-in user – show error and retry or restore (401). Also show after timeout while profile loading (stuck).
    // Use profileWaitTimedOut alone (not && profileLoading) so the retry card always appears once we've timed out.
    if (hasValidToken && (profileWaitTimedOut || (!profileLoading && profileError))) {
        const is401 =
            !profileWaitTimedOut &&
            ((profileQueryError as { response?: { status?: number }; status?: number } | undefined)?.response?.status === 401 ||
                (profileQueryError as { response?: { status?: number }; status?: number } | undefined)?.status === 401);

        const handleRetryAuth = async () => {
            setIsRetryingAuth(true);
            setProfileWaitTimedOut(false);
            try {
                await triggerRestore();
                const result = await refetch();
                if (result.isError) {
                    const err = result.error as { response?: { status?: number }; status?: number } | undefined;
                    const still401 = err?.response?.status === 401 || err?.status === 401;
                    if (still401) {
                        removeAuthToken();
                        router.push(`/login?returnUrl=${encodeURIComponent(pathname || "/")}`);
                    }
                }
            } finally {
                setIsRetryingAuth(false);
            }
        };

        const handleRetry = () => {
            setProfileWaitTimedOut(false);
            refetch();
        };

        return (
            <>
                <Suspense fallback={<div className="fixed top-0 left-0 right-0 w-full bg-white border-b border-gray-200 py-4 h-20"></div>}>
                    <Header />
                </Suspense>
                <main className="mx-auto px-4 sm:px-6 md:px-8 lg:px-16 pt-4 sm:pt-24 md:pt-32 lg:pt-36 max-w-7xl">
                    <div className="mx-auto p-4 sm:p-6 md:p-8 space-y-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tvůj profil</h1>
                        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center space-y-4">
                            <p className="text-base text-foreground">
                                {is401
                                    ? "Session vypršela nebo vyžaduje obnovení."
                                    : "Profil se nepodařilo načíst. Zkus obnovit stránku nebo to zkusit znovu."}
                            </p>
                            {is401 ? (
                                <Button onClick={handleRetryAuth} variant="default" size="lg" disabled={isRetryingAuth}>
                                    {isRetryingAuth ? "Obnovuji…" : "Obnovit přihlášení"}
                                </Button>
                            ) : (
                                <Button onClick={handleRetry} variant="default" size="lg">
                                    Zkusit znovu
                                </Button>
                            )}
                        </div>
                    </div>
                </main>
            </>
        );
    }

    // Example profile data - better profile example
    const exampleProfile = {
        givenName: "Simona",
        familyName: "Pracovitá",
        birthDate: "2000-01-01",
        description: "Chci se rozvíjet v oboru fyzioterapie a po škole v oboru pracovat. Hledám praxi při škole a jsem otevřená i nabídkám v marketingu nebo sportu.",
        avatarImage: {
            url: "/img/example-profile.png"
        },
        experience: [
            { title: "Asistent prodeje", companyName: "Superzoo" },
            { title: "Zahradník", companyName: "Střední škola zemědělská a potravinářská, obor zahradník" }
        ],
        skills: [
            "Absolvent SŠ",
            "Řidičský průkaz sk. B",
            "Učenlivá",
            "Ráda pracuji v týmu",
            "Spolehlivá",
            "Studuji VŠ"
        ],
        userSchools: [
            {
                id: 1,
                school: { id: 1, name: "(UK/CUNI) Univerzita Karlova (Fakulta tělesné výchovy a sportu)", city: "Praha" },
                schoolFaculty: { name: "Fakulta tělesné výchovy a sportu" },
                status: "in_progress_1",
                otherText: undefined
            },
            {
                id: 2,
                school: { id: 2, name: "Střední škola zemědělská a potravinářská", city: "Klatovy" },
                schoolFaculty: undefined,
                status: "completed",
                otherText: undefined
            }
        ],
        areas: [
            { id: 1, place: { address: "Praha" } }
        ],
        subscribedNotifications: {
            newOneTimeJobs: ["phone"],
            newLongTermJobs: ["phone"]
        },
        updatedAt: new Date().toISOString(),
    };

    const profileData = hasValidToken && userProfile?.data ? userProfile.data : exampleProfile;
    const isExampleProfile = !hasValidToken || !userProfile?.data;

    return (
        <>
            <Suspense fallback={<div className="fixed top-0 left-0 right-0 w-full bg-white border-b border-gray-200 py-4 h-20"></div>}>
                <Header />
            </Suspense>
            <main className="mx-auto px-4 sm:px-6 md:px-8 lg:px-16 pt-4 sm:pt-24 md:pt-32 lg:pt-36 max-w-7xl">
                <div className="mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                    <div className="mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-2 sm:mb-2">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                                {hasValidToken ? "Tvůj profil" : "Nech se oslovovat firmami"}
                            </h1>
                            {hasValidToken && userProfile?.data && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">

                                    <span className="text-xs sm:text-sm text-gray-600">
                                        Tvůj profil je {hideProfile ? "skrytý" : "veřejný"} pro firmy
                                    </span>
                                    <Switch
                                        checked={!hideProfile}
                                        onCheckedChange={(checked) => handleHideProfileToggle(!checked)}
                                    />
                                </div>
                            )}
                        </div>
                        <p
                            className='text-base sm:text-lg'

                        >
                            {hasValidToken
                                ? "Jsi v naší uzamčené databázi 70 000+ studentů a absolventů. Ověřené firmy v ní přímo hledají talenty – a když máš dobře vyplněný profil, můžeš se objevit přesně v jejich hledáčku. Dej si na profilu záležet, ať ti chodí nabídky šité přímo na tebe."
                                :
                                <>
                                    <strong>Buď v uzamčené QuickJOBS databázi 70 000+ studentů a absolventů.</strong>
                                    {" "}
                                    Ověřené firmy v ní přímo hledají talenty – a když máš dobře vyplněný profil, můžeš se objevit přesně v jejich hledáčku. Dej si na profilu záležet, ať ti chodí nabídky šité přímo na tebe.
                                </>
                            }
                        </p>
                        {!hasValidToken && (
                            <Button
                                size="lg"
                                className="mt-6 uppercase font-semibold px-8"
                                onClick={() => router.push(pathname ? `/login?returnUrl=${encodeURIComponent(pathname)}` : "/login")}
                            >
                                Jdu do toho – za 5 minut mi to stojí
                            </Button>
                        )}
                    </div>

                    {/* Sekce s firmami – jen pro nepřihlášené */}
                    {!hasValidToken && (
                        <section className="rounded-xl overflow-hidden bg-[#1D3A4B] text-white px-4 sm:px-6 md:px-8 py-8 sm:py-10">
                            <div className="text-center mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold mb-1">
                                    2000+ HRistů z největších firem v ČR
                                </h2>
                                <p className="text-white/90 text-base sm:text-lg">
                                    využívá QuickJOBS k oslovení další generace talentů
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 md:gap-4">
                                {COMPANY_LOGO_IDS.map((id) => (
                                    <div
                                        key={id}
                                        className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-[10px] overflow-hidden bg-white flex items-center justify-center"
                                    >
                                        <Image
                                            src={`${WIX_MEDIA}/${id}/v1/fill/w_166,h_166,q_90,enc_avif,quality_auto/${id}`}
                                            alt="Logo partnera"
                                            width={83}
                                            height={83}
                                            className="object-contain w-full h-full"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {hasValidToken && (
                        <>
                            <h2 className="text-lg sm:text-xl font-semibold text-green-600 -mb-10">
                                Náhled tvého profilu z pohledu zaměstnavatele
                            </h2>
                            <div className="border-2 border-green-500 rounded-lg p-4 sm:p-6">
                                <ProfilePreview
                                    user={profileData as any}
                                    isExampleProfile={isExampleProfile}
                                    onEditName={() => router.push("/profile/edit")}
                                    onEditEducation={() => setShowSchoolModal(true)}
                                    onEditExperience={() => setShowExperienceModal(true)}
                                    onEditSkills={() => setShowSkillsModal(true)}
                                    onEditLocation={() => router.push("/profile/edit?open=location")}
                                    onEditJobTypes={() => router.push("/profile/edit#job-types")}
                                    editJobTypesHref="/profile/edit#job-types"
                                    onToggleJobType={handleToggleJobType}
                                    togglingJobType={togglingJobType}
                                />
                            </div>
                            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4">
                                <span className="text-xl sm:text-2xl">👍</span>
                                <h2 className="text-lg sm:text-xl font-semibold text-blue-600">
                                    Příklad kvalitního profilu
                                </h2>
                            </div>
                            <div className="border-2 border-blue-500 rounded-lg p-4 sm:p-6">
                                <LazyProfilePreview
                                    user={exampleProfile as any}
                                    isExampleProfile={true}
                                    showEditButtons={false}
                                />
                            </div>
                        </>
                    )}

                    {hasValidToken && (
                        <>
                            <SchoolModal
                                open={showSchoolModal}
                                onOpenChange={setShowSchoolModal}
                                onSuccess={handleSchoolSuccess}
                            />
                            <SkillsModal
                                open={showSkillsModal}
                                onOpenChange={setShowSkillsModal}
                                initialSkills={userProfile?.data?.skills || []}
                                onSuccess={async () => {
                                    await refetch();
                                    queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
                                }}
                            />
                            <ExperienceModal
                                open={showExperienceModal}
                                onOpenChange={setShowExperienceModal}
                                initialExperiences={(userProfile?.data?.experience || []).map((item) => ({
                                    title: item.title ?? "",
                                    companyName: item.companyName ?? "",
                                }))}
                                onSuccess={async () => {
                                    await refetch();
                                    queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
                                }}
                            />
                        </>
                    )}
                </div>
            </main>
        </>
    );
}
