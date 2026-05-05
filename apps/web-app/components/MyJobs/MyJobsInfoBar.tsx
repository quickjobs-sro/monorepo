"use client";

import { Button } from "@ui/components/core/button";
import { Card } from "@ui/components/core/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ui/components/core/popover";
import { ScrollArea } from "@ui/components/core/scroll-area";
import { Skeleton } from "@ui/components/core/skeleton";
import { TryAgain } from "@ui/components/TryAgain";
import { getJobTypeFromPathname } from "@ui/helpers";
import { getPackageUsages } from "@ui/helpers/getAdvertUsage";
import { useGetAccountInfo } from "@ui/hooks/useGetAccountInfo";
import { ChevronDown, Lightbulb } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { NewJobButton } from "../NewJobButton";

const JOB_TYPE_MAP = {
  oneTime: "jednorázových brigád",
  longTerm: "dlouhodobých brigád",
  fullTime: "plných úvazků",
} as const;

export const TipsLink = () => (
  <span className="flex gap-2 items-center hover:text-emerald-500">
    <Lightbulb className="w-6 h-6" />
    <a
      href="https://www.quickjobs.cz/jak-napsat-inzerat-pro-mlade"
      target="_blank"
      className="rounded-md underline"
    >
      10 tipů: Jak na inzerát, aby oslovil pro mladé
    </a>
  </span>
);

const InfoBarContainer = ({ children }: { children: React.ReactNode }) => (
  <div
    className="shadow-md items-center px-4 justify-between w-full flex z-20"
    style={{
      height: JOBS_INFO_BAR_HEIGHT,
    }}
  >
    {children}
  </div>
);

export const JOBS_INFO_BAR_HEIGHT = 56;
export const MyJobsInfoBar = () => {
  const { data, isLoading, isSuccess, isError, refetch } = useGetAccountInfo();
  const { push } = useRouter();
  const pathname = usePathname();
  const type = getJobTypeFromPathname(pathname);
  const totalAdvert = isSuccess && data?.totalJobCredits[type!];
  const jobType = type ? JOB_TYPE_MAP[type] : "";

  const usages = isSuccess
    ? getPackageUsages(data!.service.packages, data!.userPackages, type!)
    : [];

  if (isLoading) {
    return (
      <InfoBarContainer>
        <div className="text-gray-500 flex items-center">
          Můžete vystavit <Skeleton className="h-4 w-10 mx-2" /> {jobType}
        </div>
        <div className="flex gap-8 items-center">
          <TipsLink />
          <React.Suspense fallback={<div>Loading...</div>}>
            <NewJobButton
              jobType={type}
              isLoading={isLoading}
              className="font-bold"
            />
          </React.Suspense>
        </div>
      </InfoBarContainer>
    );
  }

  if (isError) {
    return (
      <InfoBarContainer>
        <TryAgain refetch={refetch} />
      </InfoBarContainer>
    );
  }

  return (
    <InfoBarContainer>
      <Popover>
        <PopoverTrigger asChild>
          <div className="text-gray-500 cursor-pointer flex items-center gap-2 hover:bg-green-50 rounded-md p-2">
            Můžete vystavit{" "}
            <span className="text-green-500">{totalAdvert}</span> {jobType}
            <ChevronDown className="w-4 h-4" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-4">
          <ScrollArea className="h-64 space-y-4 pb-10">
            <div className="flex flex-col gap-2">
              {usages.map(({ usage, endsAt }, index) => (
                <Card
                  key={index}
                  className="flex items-center justify-between p-4 shadow-sm rounded-xl border"
                >
                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-gray-700">
                      Balíček: {usage.total} inzerátů
                    </p>
                    <p className="text-xs text-gray-500">
                      Platnost do {new Date(endsAt).toLocaleDateString("cs-CZ")}
                    </p>
                  </div>

                  <div className="flex flex-col items-end bg-green-50 px-4 py-2 rounded-lg">
                    <p className="text-xs text-gray-500">Dostupné</p>
                    <p className="text-lg font-bold text-green-600">
                      {usage.remaining}
                      <span className="text-sm font-normal text-gray-400">
                        / {usage.total}
                      </span>
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <Button
            className="mx-auto w-full"
            onClick={() => {
              push(`/dashboard/pricing?jobType=${type}`);
            }}
          >
            Získat další inzeráty
          </Button>
        </PopoverContent>
      </Popover>
      <div className="flex gap-8 items-center">
        <TipsLink />
        <NewJobButton
          jobType={type}
          isLoading={isLoading}
          className="font-bold"
        />
      </div>
    </InfoBarContainer>
  );
};
