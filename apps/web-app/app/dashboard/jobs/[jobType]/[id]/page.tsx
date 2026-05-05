"use client";
import { JobApplicationsList } from "@ui/components/job/JobApplicationsList";
import { useParams } from "next/navigation";
import React, { Suspense } from "react";

export default function Page(): JSX.Element {
  const params = useParams();
  const jobId = params.id as string;
  const jobType = params.jobType as string;

  if (
    !jobId ||
    !jobType ||
    typeof jobId !== "string" ||
    typeof jobType !== "string"
  ) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Nastala chyba při načítání detailu inzerátu</p>
          <p className="text-sm text-gray-600">
            Pokud se toto zobrazuje stále, kontaktujte nás na{" "}
            <a href="mailto:podpora@quickjobs.cz" className="text-blue-600 underline">
              podpora@quickjobs.cz
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id={`${jobType}-jobs`}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Načítáme aplikace...</p>
          </div>
        </div>
      }>
        <JobApplicationsList jobId={jobId} />
      </Suspense>
    </div>
  );
}
