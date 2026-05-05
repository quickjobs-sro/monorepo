"use client";
import { ScrollArea } from "@ui/components/core/scroll-area";
import { Navbar } from "@ui/components/Navbar";
import { ConditionalWrapper } from "@ui/helpers/ConditionalWrapper";
import { useGetPendingReviews } from "@ui/hooks/useGetPendingReviews";
import { useMyJobs } from "@ui/hooks/useMyJobs";
import { Info, Milestone, Tags, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { JOB_TERM } from "quickjobs-api-wrapper";
import { useEffect, useState } from "react";
import { Button } from "ui/components/core/button";
import { cn } from "ui/lib/utils";

const NAV_ITEMS = [
  {
    label: "Plné úvazky",
    href: "/dashboard/jobs/full-time",
  },
  {
    label: "Dlouhodobé brigády / Stáže",
    href: "/dashboard/jobs/long-time",
  },
  {
    label: "Jednorázové brigády",
    href: "/dashboard/jobs/one-time",
  },

  {
    label: "Hodnocení",
    href: "/dashboard/rating",
  },
];

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { push } = useRouter();
  const pathname = usePathname();
  const { data: pendingReviews } = useGetPendingReviews();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prefetch data for all job types to improve navigation speed
  useMyJobs(JOB_TERM.FULL_TIME);
  useMyJobs(JOB_TERM.LONG_TERM);
  useMyJobs(JOB_TERM.ONE_TIME);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
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
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  if (isMobile) {
    return <MobileWarning />;
  }

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-shrink-0">
        <Navbar
          onLogoClick={() => push("/dashboard")}
          menuItems={[
            {
              label: "Slevy a výhody od partnerů",
              icon: <Tags className="mr-2 h-4 w-4" />,
              onClick: () =>
                window.open(
                  "https://www.quickjobs.cz/slevy-a-vyhody-pro-zamestnavatele",
                  "_blank"
                ),
            },
            {
              label: "Můj profil",
              icon: <User className="mr-2 h-4 w-4" />,
              onClick: () => push("/dashboard/profile"),
            },
            {
              label: "Původní verze",
              icon: <Milestone className="mr-2 h-4 w-4" />,
              onClick: () =>
                window.open(
                  "https://old.app.quickjobs.cz/login",
                  "_blank"
                ),
            },
            {
              label: "Jak to funguje?",
              icon: <Info className="mr-2 h-4 w-4" />,
              onClick: () => push("/dashboard/"),
            },
          ]}
        >
          <Button
            className="uppercase"
            onClick={() => push("/dashboard/pricing")}
          >
            Ceník
          </Button>
          {NAV_ITEMS.map(({ href, label }) => {
            const pathnameSegments = pathname.split("/").filter(Boolean);
            const itemHrefSegments = href?.split("/").filter(Boolean) ?? [];

            const isActive =
              href === "/dashboard/"
                ? pathname === "/dashboard"
                : itemHrefSegments.every(
                    (segment, index) =>
                      pathnameSegments[index]?.replace(/\/$/, "") ===
                      segment.replace(/\/$/, "")
                  );

            return (
              <Link key={href} href={href} prefetch={true}>
                <Button
                  variant="ghost"
                  className={cn(
                    "text-white",
                    isActive && "bg-[#ffffff1a] text-green-500"
                  )}
                >
                  {label}
                  {label === "Hodnocení" &&
                    pendingReviews?.pendingReviews?.length > 0 && (
                      <span className="text-xs text-white bg-emerald-500 rounded-full h-5 w-5 flex items-center justify-center">
                        {pendingReviews?.pendingReviews?.length}
                      </span>
                    )}
                </Button>
              </Link>
            );
          })}

          <button
            className="text-white border-2 border-emerald-500 rounded-md px-4 py-2 uppercase"
            onClick={() => push("https://candidates.quickjobs.cz/")}
          >
            Datábaze
          </button>
        </Navbar>
      </div>
      <ConditionalWrapper
        condition={!pathname.includes("jobs")}
        wrapper={(children: React.ReactNode) => (
          <ScrollArea className="flex-1 w-full">{children}</ScrollArea>
        )}
      >
        <div className="flex flex-1 flex-col w-full">{children}</div>
      </ConditionalWrapper>
    </main>
  );
}
