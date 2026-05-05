"use client";

import { JobPortalLoginCard } from "../../components/JobPortalLoginCard";
import { useSearchParams } from "next/navigation";
import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";
import { useEffect, useState, Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { Card } from "@ui/components/core/card";

function LoginPageContent() {
    const router = useRouterWithNavigationLoading();
    const searchParams = useSearchParams();
    const [isMounted, setIsMounted] = useState(false);
    const [returnUrl, setReturnUrl] = useState<string | null>(null);
    const [backButtonText, setBackButtonText] = useState<string>("Detail nabídky");
    const [showBackButton, setShowBackButton] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        // Get return URL from query parameter or referrer
        const returnUrlParam = searchParams.get("returnUrl");
        if (returnUrlParam) {
            // Decode the return URL (handles %2F -> /)
            const decodedReturnUrl = decodeURIComponent(returnUrlParam);
            setReturnUrl(decodedReturnUrl);
            setShowBackButton(true);
            // Determine back button text based on return URL
            if (decodedReturnUrl === "/" || decodedReturnUrl === "") {
                setBackButtonText("Profil");
            } else if (decodedReturnUrl.startsWith("/jobs/detail/")) {
                setBackButtonText("Detail nabídky");
            } else if (decodedReturnUrl === "/jobs" || decodedReturnUrl.startsWith("/jobs?")) {
                setBackButtonText("Seznam nabídek");
            } else if (decodedReturnUrl.startsWith("/companies")) {
                setBackButtonText("Firmy");
            }
        } else if (typeof window !== "undefined" && document.referrer) {
            // Use referrer if available
            try {
                const referrer = new URL(document.referrer);
                if (referrer.pathname !== "/login" && referrer.origin === window.location.origin) {
                    const referrerUrl = referrer.pathname + referrer.search;
                    setReturnUrl(referrerUrl);
                    setShowBackButton(true);
                    // Determine back button text based on referrer
                    if (referrer.pathname === "/" || referrer.pathname === "") {
                        setBackButtonText("Profil");
                    } else if (referrer.pathname.startsWith("/jobs/detail/")) {
                        setBackButtonText("Detail nabídky");
                    } else if (referrer.pathname === "/jobs" || referrer.pathname.startsWith("/jobs?")) {
                        setBackButtonText("Seznam nabídek");
                    } else if (referrer.pathname.startsWith("/companies")) {
                        setBackButtonText("Firmy");
                    }
                }
            } catch (error) {
                // Invalid referrer URL, ignore
            }
        }
    }, [searchParams]);

    const handleLoginSuccess = () => {
        // Redirect to return URL, detail page, or home
        if (returnUrl) {
            router.push(returnUrl);
        } else {
            router.push("/jobs");
        }
    };

    const handleBack = () => {
        // Go back to return URL, previous page, or home
        if (returnUrl) {
            router.push(returnUrl);
        } else if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push("/jobs");
        }
    };

    if (!isMounted) {
        return (
            <main className="flex flex-col items-center pb-10">
                <div className="w-screen bg-blue py-8 sm:py-16 px-4 sm:px-8 flex items-center justify-center shadow-md">
                    <img
                        src="/logo.svg"
                        alt="QuickJOBS Logo"
                        className="h-8 w-24 sm:h-[100px] sm:w-[300px]"
                    />
                </div>
                <Card className="w-full max-w-md shadow-md z-10 p-20 mt-[-24px] sm:mt-[-50px]">
                    <div className="text-center">Loading...</div>
                </Card>
            </main>
        );
    }

    return (
        <main className="flex flex-col items-center pb-10">
            <div className={`w-screen bg-blue py-8 sm:py-16 px-4 sm:px-8 flex items-center shadow-md relative ${showBackButton ? "justify-between sm:justify-center" : "justify-center"}`}>
                {showBackButton && (
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors text-left min-w-0 sm:absolute sm:w-full sm:left-8 sm:top-10 sm:translate-x-1/4"
                    >
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                        <span className="text-white text-sm sm:text-lg font-normal sm:font-bold truncate">{backButtonText}</span>
                    </button>
                )}
                <img
                    src="/logo.svg"
                    alt="QuickJOBS Logo"
                    className="h-8 w-24 sm:h-[100px] sm:w-[300px] flex-shrink-0"
                />
            </div>

            <div className="flex items-center justify-center mt-[-24px] sm:mt-[-50px] bg-transparent">
                <JobPortalLoginCard
                    callback={handleLoginSuccess}
                    isLoading={false}
                    onBack={handleBack}
                    userType="applicant"
                    backButtonText={backButtonText}
                />
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <main className="flex flex-col items-center">
                <div className="w-screen bg-blue py-16 px-8 flex items-center justify-center shadow-md">
                    <img
                        src="/logo.svg"
                        alt="QuickJOBS Logo"
                        className="h-[100px] w-[300px]"
                    />
                </div>
                <div className="flex items-center justify-center mt-[-50px] bg-transparent">
                    <div className="text-center">Loading...</div>
                </div>
            </main>
        }>
            <LoginPageContent />
        </Suspense>
    );
}

