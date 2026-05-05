"use client";
import { TryAgain } from "@ui/components/TryAgain";
import { useMyJobs } from "@ui/hooks/useMyJobs";
import { MyJobsInfoBar } from "@webapp/components/MyJobs/MyJobsInfoBar";
import {
  JOB_TYPE_TO_TERM,
  MyJobsList,
} from "@webapp/components/MyJobs/MyJobsList";
import { MyJobStatistic } from "@webapp/components/MyJobs/MyJobStatistic";
import { NewJobButton } from "@webapp/components/NewJobButton";
import { AlertCircle, ThumbsUp } from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const jobType = pathname.split("/")[3] as keyof typeof JOB_TYPE_TO_TERM;
  const jobTerm = JOB_TYPE_TO_TERM[jobType];

  const { data, isLoading, isError, refetch } = useMyJobs(jobTerm);
  const noJobs = data?.pages?.[0]?.jobs?.length === 0;

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <MyJobsInfoBar />
        <div className="flex flex-col items-center justify-center h-full my-auto gap-y-6 w-full flex-grow">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-lg text-gray-600">Načítáme vaše inzeráty...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <MyJobsInfoBar />

      {isError ? (
        <div className="flex flex-col items-center justify-center h-full my-auto gap-y-6 w-full flex-grow">
          <AlertCircle className="w-24 h-24 text-gray-600" />
          <p className="text-xl text-center text-gray-600 ">
            Něco se pokazilo. Je nám to líto, pracujeme na opravě.
          </p>
          <TryAgain refetch={refetch} />
        </div>
      ) : !data && !isLoading ? (
        <div className="flex flex-col items-center justify-center h-full my-auto gap-y-6 w-full flex-grow">
          <AlertCircle className="w-24 h-24 text-gray-600" />
          <p className="text-xl text-center text-gray-600 ">
            Nepodařilo se načíst data. Zkontrolujte připojení k internetu.
          </p>
          <TryAgain refetch={refetch} />
        </div>
      ) : noJobs ? (
        <div className="flex flex-col items-center justify-center h-full my-auto gap-y-6 w-full flex-grow">
          <ThumbsUp className="w-24 h-24 text-gray-600" />
          <p className="text-xl text-center text-gray-600 ">
            Vystavte svůj první inzerát a ihned oslovte studenty a absolventy
            přímo v jejich telefonech.
          </p>
          <React.Suspense fallback={<div>Loading...</div>}>
            <NewJobButton className="mt-2" />
          </React.Suspense>
        </div>
      ) : (
        <>
          <div className="flex flex-row">
            <div className="w-1/3">
              <MyJobsList />
            </div>
            <div className="flex flex-col w-2/3">
              <MyJobStatistic />
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
