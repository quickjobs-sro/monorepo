"use client";
import { Button } from "@ui/components/core/button";
import { getJobTypeLabel } from "@ui/helpers";
import { PathJobType } from "@ui/helpers/getJobTypeFromPathname";
import { GrammaticalForm } from "@ui/helpers/getJobTypeLabel";
import { cn } from "@ui/lib/utils";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NewJobDialog } from "./dialogs/NewEditJobDialog";

export const NewJobButton = ({
  jobType,
  isLoading,
  className,
  customText,
  job,
}: {
  jobType?: PathJobType;
  isLoading?: boolean;
  className?: string;
  customText?: string;
  job?: any;
}) => {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const openParam = searchParams.get("open");
  const label = getJobTypeLabel(jobType, false, GrammaticalForm.Accusative);

  useEffect(() => {
    if (openParam) {
      setOpen(true);
    }
  }, [openParam]);

  return (
    <>
      <Button
        disabled={isLoading}
        onClick={() => setOpen(true)}
        className={cn("uppercase", className)}
      >
        {customText || `Vystavit ${jobType ? label : "nový inzerát"}`}
      </Button>
      <NewJobDialog
        open={open}
        setOpen={setOpen}
        job={job}
        isSimilarJob={!!job}
      />
    </>
  );
};
