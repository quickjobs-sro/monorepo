"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import { LogOut, Menu, User, Briefcase, Building2 } from "lucide-react";
import { LogoType } from "../icons";
import { Button } from "@ui/components/core/button";
import { NavigationLink } from "@ui/components/core/navigation-link";
import { TrackedAnchor } from "@ui/components/core/tracked-anchor";
import { usePathname } from "next/navigation";
import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";
import { useGetProfile } from "../hooks/useGetProfile";
import { getAuthToken, removeAuthToken, isValidToken } from "../lib/constants";
import { initUserId } from "../lib/analytics";
import { UserAvatar } from "@ui/components/userAvatar";
import { useToast } from "@ui/hooks/use-toast";
import { useTokenRestore } from "./TokenRestoreProvider";
import { reportError } from "../lib/reportError";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "@ui/components/core/dialog";
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarTrigger,
} from "@ui/components/core/menubar";
import { cn } from "@ui/lib/utils";
import API from "../lib/legacyApi";

const LoadingSkeleton = () => (
    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
);

const AuthActions = () => {
    const pathname = usePathname();
    const router = useRouterWithNavigationLoading();
    const { toast } = useToast();
    const { mounted, tokenRestored } = useTokenRestore();
    const token = mounted ? getAuthToken() : null;
    const hasValidToken = mounted && tokenRestored && !!token && isValidToken(token);

    // Add small delay after token restore to avoid overwhelming backend
    // Use sessionStorage to track if we've already triggered the fetch (survives Fast Refresh)
    const PROFILE_STORAGE_KEY = 'profile-fetch-triggered';
    const shouldFetchProfileComputed = React.useMemo(() => {
        return hasValidToken;
    }, [hasValidToken, mounted, tokenRestored, token]);

    // Use a debounced version to add delay
    // Initialize to false to avoid hydration mismatch (check sessionStorage after mount)
    const [debouncedShouldFetchProfile, setDebouncedShouldFetchProfile] = React.useState(false);

    // Check sessionStorage after mount to avoid hydration mismatch
    React.useEffect(() => {
        if (typeof window !== 'undefined' && sessionStorage.getItem(PROFILE_STORAGE_KEY) === 'true') {
            setDebouncedShouldFetchProfile(true);
        }
    }, []);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        // Clear any existing timer
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        // If already triggered, don't set up timer again
        if (shouldFetchProfileComputed && typeof window !== 'undefined' && sessionStorage.getItem(PROFILE_STORAGE_KEY) === 'true') {
            setDebouncedShouldFetchProfile(true);
            return;
        }

        if (shouldFetchProfileComputed) {
            // Delay profile request by 300ms after token restore
            // Stagger requests to avoid hitting DB simultaneously
            timerRef.current = setTimeout(() => {
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem(PROFILE_STORAGE_KEY, 'true');
                }
                setDebouncedShouldFetchProfile(true);
                timerRef.current = null;
            }, 300);
        } else {
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem(PROFILE_STORAGE_KEY);
            }
            setDebouncedShouldFetchProfile(false);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [shouldFetchProfileComputed, mounted, tokenRestored, token]);

    const { data: userProfile, isLoading: profileLoading, isError: profileError } = useGetProfile(debouncedShouldFetchProfile);

    // Track if component has hydrated to ensure server/client render match
    const [hasHydrated, setHasHydrated] = React.useState(false);
    // Pojistka: po 8 s přestaneme čekat na profil (dev i prod – nikdy nezůstat v loading)
    const [profileWaitTimedOut, setProfileWaitTimedOut] = React.useState(false);

    React.useEffect(() => {
        setHasHydrated(true);
    }, []);

    React.useEffect(() => {
        if (!hasValidToken || !profileLoading) return;
        const t = setTimeout(() => setProfileWaitTimedOut(true), 8000);
        return () => clearTimeout(t);
    }, [hasValidToken, profileLoading]);

    // Get return URL - pathname + search (from window after mount to avoid useSearchParams Suspense)
    const [loginUrl, setLoginUrl] = React.useState("/login");

    React.useEffect(() => {
        if (!mounted || !hasHydrated || typeof window === "undefined") return;
        const path = window.location.pathname || "/";
        const returnUrl = path + (window.location.search || "");
        const newLoginUrl = path !== "/login"
            ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
            : "/login";
        setLoginUrl(newLoginUrl);
    }, [mounted, hasHydrated, pathname]);

    const isLoggedIn = mounted && token && userProfile?.data;
    const userData = !profileLoading && userProfile?.data;

    // Show loading only until hydrated + mounted; only block on profile when we have a token.
    // Pojistka: po 8 s (profileWaitTimedOut) už nečekáme – nikdy nezůstat v loading na first load.
    if (!hasHydrated || !mounted || ((hasValidToken && profileLoading) && !profileWaitTimedOut)) {
        return <LoadingSkeleton />;
    }

    if (isLoggedIn) {
        return (
            <Menubar className="border-0 p-0 bg-transparent cursor-pointer">
                <MenubarMenu>
                    <MenubarTrigger
                        disabled={profileLoading}
                        color="transparent"
                        className="cursor-pointer bg-transparent focus:outline-none focus:bg-transparent disabled:cursor-not-allowed disabled:bg-transparent data-[state=open]:bg-transparent"
                    >
                        <UserAvatar
                            isError={profileError}
                            isLoading={profileLoading}
                            showName
                            nameProps={{ className: "text-md font-medium text-black" }}
                            wrapperProps={{ className: "justify-end " }}
                            {...(userData as any)}
                        />
                    </MenubarTrigger>
                    <MenubarContent align="end">
                        <MenubarItem
                            className="text-md"
                            onClick={() => router.push("/my-jobs")}
                            gaCategory="Header"
                            gaAction="Moje práce"
                            gaLabel="menu"
                        >
                            Moje práce
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem
                            className="text-md"
                            onClick={() => router.push("/profile/edit")}
                            gaCategory="Header"
                            gaAction="Upravit profil"
                            gaLabel="menu"
                        >
                            Upravit profil
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem
                            className="text-md"
                            onClick={async () => {
                                if (token) {
                                    try {
                                        await API.authorization.logout(true);
                                    } catch (error) {
                                        toast({
                                            title: "Nastala chyba",
                                            description: "Nastala chyba při odhlášení",
                                            variant: "destructive",
                                        });
                                    }
                                }
                                removeAuthToken();
                                initUserId(null);
                                toast({
                                    title: "Odhlášení proběhlo úspěšně",
                                    description: "Vraťte se prosím na domovskou stránku",
                                });
                                window.location.reload();
                            }}
                        >
                            <LogOut className="mr-2 h-4 w-4" /> Odhlásit se
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
            </Menubar>
        );
    }

    return (
        <NavigationLink
            href={loginUrl}
            gaCategory="Header"
            gaAction="Přihlásit / Zaregistrovat"
            gaLabel="click"
        >
            <Button variant='default' size="sm" className="uppercase">Přihlásit / Zaregistrovat</Button>
        </NavigationLink>
    );
};


/** Mobile hamburger content: avatar + name at top, then auth actions (Moje práce, Upravit profil, Odhlásit, Pro firmy). No green nav here – that stays in header. */
const PROFILE_STORAGE_KEY = 'profile-fetch-triggered';

const MobileDrawerContent = ({ onNavigate }: { onNavigate: () => void }) => {
    const router = useRouterWithNavigationLoading();
    const { toast } = useToast();
    const { mounted, tokenRestored } = useTokenRestore();
    const token = mounted ? getAuthToken() : null;
    const hasValidToken = mounted && tokenRestored && !!token && isValidToken(token);

    const shouldFetchProfileComputed = React.useMemo(() => hasValidToken, [hasValidToken, mounted, tokenRestored, token]);
    const [debouncedShouldFetchProfile, setDebouncedShouldFetchProfile] = React.useState(false);

    React.useEffect(() => {
        if (typeof window !== 'undefined' && sessionStorage.getItem(PROFILE_STORAGE_KEY) === 'true') {
            setDebouncedShouldFetchProfile(true);
        }
    }, []);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);
    React.useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (shouldFetchProfileComputed && typeof window !== 'undefined' && sessionStorage.getItem(PROFILE_STORAGE_KEY) === 'true') {
            setDebouncedShouldFetchProfile(true);
            return;
        }
        if (shouldFetchProfileComputed) {
            timerRef.current = setTimeout(() => {
                if (typeof window !== 'undefined') sessionStorage.setItem(PROFILE_STORAGE_KEY, 'true');
                setDebouncedShouldFetchProfile(true);
                timerRef.current = null;
            }, 300);
        } else {
            if (typeof window !== 'undefined') sessionStorage.removeItem(PROFILE_STORAGE_KEY);
            setDebouncedShouldFetchProfile(false);
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [shouldFetchProfileComputed, mounted, tokenRestored, token]);

    const { data: userProfile, isLoading: profileLoading, isError: profileError } = useGetProfile(debouncedShouldFetchProfile);
    const [hasHydrated, setHasHydrated] = React.useState(false);
    React.useEffect(() => setHasHydrated(true), []);

    const [loginUrl, setLoginUrl] = React.useState("/login");
    const pathname = usePathname();
    React.useEffect(() => {
        if (!mounted || !hasHydrated || typeof window === "undefined") return;
        const path = window.location.pathname || "/";
        const returnUrl = path + (window.location.search || "");
        setLoginUrl(path !== "/login" ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login");
    }, [mounted, hasHydrated, pathname]);

    const isLoggedIn = mounted && token && userProfile?.data;
    const userData = !profileLoading && userProfile?.data;

    const handleLogout = async () => {
        if (token) {
            try {
                await API.authorization.logout(true);
            } catch (error) {
                reportError(error, { location: "Header.logout" });
                console.error("Error during logout:", error);
                toast({ title: "Nastala chyba", description: "Nastala chyba při odhlášení", variant: "destructive" });
            }
        }
        removeAuthToken();
        initUserId(null);
        toast({ title: "Odhlášení proběhlo úspěšně", description: "Vraťte se prosím na domovskou stránku" });
        onNavigate();
        window.location.reload();
    };

    if (!hasHydrated || !mounted || (hasValidToken && profileLoading)) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="flex flex-col gap-6 pt-2">
            {isLoggedIn && userData ? (
                <div className="flex items-center gap-3">
                    <UserAvatar
                        isError={profileError}
                        isLoading={profileLoading}
                        showName
                        nameProps={{ className: "text-md font-medium text-white" }}
                        wrapperProps={{ className: "justify-start" }}
                        {...(userData as any)}
                    />
                </div>
            ) : null}
            <div className={cn("flex flex-col gap-3", isLoggedIn ? "border-t border-white/30 pt-4" : "")}>
                {isLoggedIn ? (
                    <>
                        <NavigationLink
                            href="/my-jobs"
                            onClick={onNavigate}
                            className="text-white text-sm hover:underline font-medium"
                            gaCategory="Header"
                            gaAction="Moje práce"
                            gaLabel="menu"
                        >
                            Moje práce
                        </NavigationLink>
                        <NavigationLink
                            href="/profile/edit"
                            onClick={onNavigate}
                            className="text-white text-sm hover:underline font-medium"
                            gaCategory="Header"
                            gaAction="Upravit profil"
                            gaLabel="menu"
                        >
                            Upravit profil
                        </NavigationLink>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-white text-sm hover:underline font-medium text-left"
                        >
                            <LogOut className="h-4 w-4 shrink-0" /> Odhlásit se
                        </button>
                    </>
                ) : (
                    <NavigationLink
                        href={loginUrl}
                        onClick={onNavigate}
                        gaCategory="Header"
                        gaAction="Přihlásit / Zaregistrovat"
                        gaLabel="menu"
                    >
                        <Button variant="default" size="sm" className="uppercase w-full bg-white text-primary hover:bg-white/90">
                            Přihlásit / Zaregistrovat
                        </Button>
                    </NavigationLink>
                )}
                <TrackedAnchor
                    href="https://www.quickjobs.cz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onNavigate}
                    className="inline-flex items-center justify-center rounded-md border-2 border-white bg-transparent px-4 py-2 text-sm font-medium uppercase text-white hover:bg-white/10 w-full"
                    gaCategory="Header"
                    gaAction="Pro firmy"
                    gaLabel="menu"
                >
                    Pro firmy
                </TrackedAnchor>
            </div>
        </div>
    );
};


const HowToGetJob = [
    { title: "Buď v databázi", link: "/", icon: User },
    { title: "Prohlížej nabídky", link: "/jobs", icon: Briefcase },
    { title: "Oslov firmy", link: "/companies", icon: Building2 },
]



export const Header = () => {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className={cn(
            "left-0 right-0 w-full bg-white border-b border-gray-200 drop-shadow-lg z-50",
            "static md:fixed md:top-0"
        )}>
            <div className="mx-auto max-w-7xl px-6 md:px-16 pt-6 pb-3 md:pt-6 md:pb-3">
                <div className="flex flex-row items-center justify-between gap-4">
                    <NavigationLink
                        href="/"
                        className="flex items-center shrink-0"
                        aria-label="QuickJOBS - Domovská stránka"
                        gaCategory="Header"
                        gaAction="Logo"
                        gaLabel="click"
                    >
                        <Image
                            src={LogoType}
                            alt="QuickJOBS - Brigády a zaměstnání v Praze"
                            width={105}
                            height={35}
                            className="h-7 w-auto shrink-0 md:h-8"
                            priority
                        />
                    </NavigationLink>

                    <div className="hidden md:flex items-center gap-2 ml-auto">
                        <Suspense fallback={<LoadingSkeleton />}>
                            <AuthActions />
                        </Suspense>
                        <TrackedAnchor
                            href="https://www.quickjobs.cz/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md border-2 border-green-500 bg-background px-3 h-9 text-sm font-medium uppercase hover:bg-accent hover:text-accent-foreground text-green-500"
                            gaCategory="Header"
                            gaAction="Pro firmy"
                            gaLabel="click"
                        >
                            Pro firmy
                        </TrackedAnchor>
                    </div>

                    <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden shrink-0"
                                aria-label="Otevřít menu"
                            >
                                <Menu className="h-6 w-6" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent
                            className="max-w-[min(90vw,320px)] p-6 bg-primary border-0 text-white !top-0 !right-0 !bottom-0 !left-auto !translate-x-0 !translate-y-0 h-full rounded-none ml-auto [&>button]:text-white [&>button]:hover:text-white"
                            onPointerDownOutside={() => setMobileMenuOpen(false)}
                        >
                            <DialogTitle className="sr-only">Menu</DialogTitle>
                            <Suspense fallback={<LoadingSkeleton />}>
                                <MobileDrawerContent onNavigate={() => setMobileMenuOpen(false)} />
                            </Suspense>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <div className="mt-3 bg-primary">
                <div className="mx-auto max-w-7xl px-6 py-3 md:py-4 md:px-16 text-white flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                    <span className="font-bold text-sm md:text-base shrink-0">3 ZPŮSOBY, jak si najít práci:</span>
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                        {HowToGetJob.map((item, index) => {
                            const isActive = item.link === "/" ? pathname === "/" : pathname === item.link || pathname.startsWith(item.link + "/");
                            const Icon = item.icon;
                            return (
                                <NavigationLink
                                    key={index}
                                    href={item.link}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-colors no-underline",
                                        isActive
                                            ? "bg-white border-white text-primary"
                                            : "bg-transparent border-white/60 text-white hover:border-white hover:bg-white/10"
                                    )}
                                    gaCategory="Header"
                                    gaAction="Nav"
                                    gaLabel={item.title}
                                >
                                    <span className={cn(
                                        "font-bold rounded-full h-6 w-6 flex items-center justify-center text-xs shrink-0",
                                        isActive ? "bg-primary text-white" : "border border-white/70 text-white/80"
                                    )}>
                                        {index + 1}
                                    </span>
                                    <span className={cn("text-sm font-semibold whitespace-nowrap", isActive ? "text-primary" : "text-white")}>
                                        {item.title}
                                    </span>
                                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-white/80")} />
                                </NavigationLink>
                            );
                        })}
                    </div>
                </div>
            </div>
        </header>
    );
};
