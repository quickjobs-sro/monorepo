import { CandidatesItem } from "@ui/components/candidate/CandidateItem";
import { ScrollArea } from "@ui/components/core/scroll-area";
import { BellRing, SearchXIcon } from "lucide-react";
import { ApplicationEmployerStatement } from "quickjobs-api-wrapper";
import React, { useEffect, useMemo, useState } from "react";
import { NewJobButton } from "../../../../../apps/web-app/components/NewJobButton";
import { useJobApplications } from "../../hooks/useJobApplications";
import { useJobDetail } from "../../hooks/useJobDetail";
import { useScrollHandler } from "../../hooks/useScrollHandler";
import { Application, PrivateUserProfile } from "../../types/api";
import { ScrollBottomShadow, ScrollTopShadow } from "../core/scroll-shadows";
import ExportCSV, { ApiResponse } from "../ExportCSV";

interface JobApplicationsListProps {
  jobId: string;
}

export const JobApplicationsList = ({ jobId }: JobApplicationsListProps) => {
  const { data, isLoading, isError } = useJobApplications(jobId);
  const { data: jobData, isLoading: jobLoading } = useJobDetail(jobId);
  const { showTopShadow, showBottomShadow, onScroll, containerRef } =
    useScrollHandler();

  const [queryParams, setQueryParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setQueryParams(new URLSearchParams(window.location.search));
    }
  }, []);

  const applicationsWithUsers = useMemo(() => data?.users || [], [data]);

  const jobStatus = useMemo(() => jobData?.data?.status || "active", [jobData]);

  const dataForExport: ApiResponse = useMemo(() => {
    if (!data) return { users: [] };
    const { users, applications } = data;
    const usersForExport = users.map((user) => {
      const application = applications.find(
        (app) => app.candidateId === user.id
      );
      return {
        ...user,
        givenName: user.givenName || "",
        familyName: user.familyName || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "male",
        birthDate: user.birthDate || "",
        age: user.age || 0,
        skills: user.skills || [],
        experience: user.experience || [],
        userSchools:
          user.userSchools?.map((school) => ({
            ...school,
            school: {
              ...school.school,
              www: school.school.www ?? "",
            },
            schoolFaculty: school.schoolFaculty
              ? {
                  ...school.schoolFaculty,
                  www: school.schoolFaculty.www ?? "",
                  schoolId: school.school.id,
                }
              : null,
            otherText: school.otherText ?? null,
          })) || [],
        candidateStatus: application
          ? {
              status:
                application.employerStatement ??
                ("pending" as ApplicationEmployerStatement),
              note: application.note,
              id: application.id,
              createdAt: application.createdAt,
              userId: application.jobId,
              candidateId: application.candidateId,
              deleted: null,
            }
          : {
              status: "pending" as ApplicationEmployerStatement,
              note: null,
              id: 0,
              createdAt: "",
              userId: 0,
              candidateId: 0,
              deleted: null,
            },
      };
    });
    return { users: usersForExport };
  }, [data]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="relative h-[calc(100vh-228px)]">
        {/* Top shadow */}
        <ScrollTopShadow show={showTopShadow} />

        <ScrollArea className="h-full" onScroll={onScroll} ref={containerRef}>
          {jobStatus !== "active" &&
            !jobLoading &&
            applicationsWithUsers.length > 0 && (
              <div className="ml-4 flex-grow flex flex-col gap-2 items-center justify-center rounded-lg p-2 border-gray-200 mr-2 my-24">
                <SearchXIcon className="w-10 h-10 text-gray-500 my-4" />
                <span className="text-xl text-gray-500 font-semibold">
                  Inzerát již není aktivní
                </span>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <NewJobButton
                    customText="Vystavit podobný inzerát"
                    job={jobData?.data}
                  />
                </React.Suspense>
              </div>
            )}
          {applicationsWithUsers.length !== 0 && (
            <div className="flex items-center gap-8 py-6">
              <span className="pl-4 text-xl text-gray-500 font-semibold">
                Uchazeči o vaši nabídku 
                {/* (
                {isLoading ? "..." : data?.users.length || 0}){" "} */}
              </span>
              <ExportCSV
                queryParams={queryParams}
                data={dataForExport}
                isLoading={isLoading}
                isError={isError}
              />
            </div>
          )}
          <div className="px-4">
            {!isLoading &&
            applicationsWithUsers.length === 0 &&
            jobStatus === "active" ? (
              <div
                className="flex-grow flex flex-col gap-2 items-center justify-center rounded-lg p-8 border-gray-200 h-[400px]"
              >
                <BellRing className="w-10 h-10 text-gray-500 my-4" />
                <span className="text-xl text-gray-500 font-semibold">
                  Nyní oslovujeme uživatele
                </span>
                <span className="text-gray-400 text-center max-w-md">
                  Jakmile někdo projeví zájem, objeví se zde. Budeme vás
                  informovat emailem.
                </span>
              </div>
            ) : jobStatus !== "active" &&
              !jobLoading &&
              applicationsWithUsers.length === 0 ? (
              <div className="ml-4 flex-grow flex flex-col gap-2 items-center justify-center rounded-lg p-2 border-gray-200 mr-2 my-24">
                <SearchXIcon className="w-10 h-10 text-gray-500 my-4" />
                <span className="text-xl text-gray-500 font-semibold">
                  Inzerát již není aktivní
                </span>
                <span className="text-gray-400 text-center max-w-md my-4">
                  Je nám líto, ale nikdo se nám nepřihlásil. Zkuste upravit
                  nabídku nebo vystavit inzerát později.
                </span>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <NewJobButton
                    customText="Vystavit podobný inzerát"
                    job={jobData?.data}
                  />
                </React.Suspense>
              </div>
            ) : (
              !isLoading &&
              applicationsWithUsers.map((user) => {
                if (!data || !user) return null;

                const application = data.applications.find(
                  (application: Application) =>
                    application.candidateId === user.id
                );

                return application ? (
                  <CandidatesItem
                    key={user.id}
                    user={user as PrivateUserProfile}
                    application={application}
                    jobStatus={jobStatus}
                  />
                ) : null;
              })
            )}
          </div>
          {!isLoading && applicationsWithUsers.length > 0 && (
            <div className="pt-4 pb-6 text-center text-gray-400">
              Jste na konci seznamu uchazečů
            </div>
          )}
        </ScrollArea>

        {/* Bottom shadow */}
        <ScrollBottomShadow show={showBottomShadow} />
      </div>
    </div>
  );
};
