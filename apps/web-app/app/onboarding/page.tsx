"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import API from "quickjobs-api-wrapper";
import Cookies from "js-cookie";

import { Onboarding } from "../../components/Onboarding";

export default function OnboardingPage() {
    const router = useRouter();
    const [userToken, setUserToken] = useState<string | undefined>(undefined);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const token = Cookies.get("QuickJobs.tokens");
        setUserToken(token);
    }, []);

    // Redirect to login if no token
    useEffect(() => {
        if (!mounted) return;
        
        if (!userToken) {
            router.push("/?forceRegistration=true");
        } else {
            try {
                const parsedToken = JSON.parse(userToken);
                API.restoreUserToken(parsedToken);
            } catch (error) {
                console.error("Error restoring token:", error);
                router.push("/?forceRegistration=true");
            }
        }
    }, [mounted, userToken, router]);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
            </div>
        );
    }

    if (!userToken) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Onboarding
                onComplete={() => router.push("/dashboard")}
                autoDetectStep={true}
                showCard={true}
            />
        </div>
    );
}
