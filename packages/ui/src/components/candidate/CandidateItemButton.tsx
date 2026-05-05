"use client";
import { Application, CandidateUserProfile } from "quickjobs-api-wrapper";
import { useState } from "react";
import { Button } from "../core/button";
import {
  ContactCandidateDialog,
  FormControlProps,
} from "../dialogs/ContactCandidateDialog";

type CandidateItemButtonProps = {
  user: Partial<CandidateUserProfile> & Partial<Application>;
  application: Application;
  applicationId: number;
  jobStatus?: string;
  employerStatement?: string;
} & FormControlProps;

export const CandidateItemButton = ({
  user,
  application,
  register,
  watch,
  setValue,
  onSubmit,
  jobStatus,
  employerStatement,
}: CandidateItemButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!user.givenName || !user.familyName || !user.email || !user.phone) {
    return null;
  }

  return (
    <div className="ml-auto relative">
      {/* {jobStatus === "active" ? ( */}
        <Button
          className="font-medium text-white uppercase"
          variant={"default"}
          onClick={() => setIsOpen(true)}
        >
          Zobrazit kontakty
        </Button>
      {/* ) : (
      //   <div className="text-gray-400 flex flex-col absolute top-0 right-0">
      //     <span className="text-lg text-g-500 font-bold">{user.phone}</span>
      //     <span className="text-lg text-emerald-500 font-bold">
      //       {user.email}
      //     </span>
      //   </div>
      // )} */}

      <ContactCandidateDialog
        application={application}
        candidate={user}
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        register={register}
        watch={watch}
        option="webapp"
        setValue={setValue}
        onSubmit={onSubmit}
      />
    </div>
  );
};
