"use client";
import { LoginCard } from "@ui/components/LoginCard";
import { useAuthLoading } from "@ui/hooks/useAuthLoading";
import { useTokenRestore } from "@ui/hooks/useTokenRestore";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function MobileWarning() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: "#182e48",
        minHeight: "100dvh", // Dynamic viewport height for mobile
      }}
    >
      <div className="text-center text-white max-w-md">
        <h1 className="text-xl font-medium mb-6 leading-relaxed">
          Webová aplikace je
          <br />
          dostupná pouze přes
          <br />
          počítač.
        </h1>

        <div className="w-16 h-px bg-white opacity-30 mx-auto mb-6"></div>

        <p className="text-sm mb-8 opacity-80">
          pokračujte na počítači pod tímto odkazem
        </p>

        <div className="text-lg font-medium">app.quickjobs.cz</div>
      </div>
    </div>
  );
}

export default function Page(): JSX.Element {
  const { push } = useRouter();
  const { restoreToken } = useTokenRestore();
  const { isLoading } = useAuthLoading();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  const userToken = Cookies?.get("QuickJobs.tokens");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      if (typeof window === 'undefined') return;
      
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice =
        /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent.toLowerCase()
        );
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Don't auto-redirect if user is being forced to complete registration
    const urlParams = new URLSearchParams(window.location.search);
    const forceRegistration = urlParams.get("forceRegistration") === "true";

    if (userToken && !forceRegistration) {
      restoreToken()
        .then((restoredToken) => {
          if (restoredToken) {
            push("/dashboard");
          }
        })
        .catch((error) => {
          console.error("Error restoring token:", error);
          Cookies.remove("QuickJobs.tokens");
        });
    }
  }, [userToken, restoreToken, push]);

  if (!mounted) {
    return (
      <main className="flex flex-col items-center">
        <div className="w-screen bg-blue py-16 px-8 flex items-center justify-center shadow-md">
          <img
            src="logo.svg"
            alt="QuickJOBS Logo"
            className="h-[100px] w-[300px]"
          />
        </div>
        <div className="flex items-center justify-center mt-[-50px] bg-transparent">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    );
  }

  if (isMobile) {
    return <MobileWarning />;
  }

  return (
    <main className="flex flex-col items-center ">
      <div className="w-screen bg-blue py-16 px-8 flex items-center justify-center shadow-md">
        <img
          src="logo.svg"
          alt="QuickJOBS Logo"
          className="h-[100px] w-[300px]"
        />
      </div>

      <div className="flex items-center justify-center mt-[-50px] bg-transparent ">
        <LoginCard callback={() => push("/dashboard")} isLoading={isLoading} />
      </div>
    </main>
  );
}
