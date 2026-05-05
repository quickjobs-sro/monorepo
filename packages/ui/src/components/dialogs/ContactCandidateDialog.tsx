"use client";

import { Button } from "@ui/components/core/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ui/components/core/dialog";
import { Textarea } from "@ui/components/core/textarea";
import { Application, CandidateUserProfile } from "quickjobs-api-wrapper";
import { Dispatch, useEffect, useMemo, useRef, useState } from "react";
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { cn } from "../../lib/utils";
import { queryClient } from "../../Providers/ServerProvider";
import { API_KEYS } from "../../types/api_keys";
import { variantClasses } from "../candidate/CandidateItem";

type statusOptionProps = {
  label: string;
  value: string;
  variant: string;
  employedStatus: string;
};

// TODO: Sjednotit statusy na BE

export const statusOptions: statusOptionProps[] = [
  {
    label: "ZAUJAL MĚ",
    value: "save",
    employedStatus: "saved",
    variant: "success",
  },
  {
    label: "NEZAUJAL MĚ",
    value: "reject",
    employedStatus: "rejected",
    variant: "destructive",
  },
  {
    label: "NEZVEDÁ TELEFON",
    value: "wait-for-response",
    employedStatus: "waiting_for_response",
    variant: "secondary",
  },
  {
    label: "POZVÁN DO DALŠÍHO KOLA",
    value: "invite-for-next-round",
    employedStatus: "invited_for_next_round",
    variant: "success",
  },
  {
    label: "ZAMĚSTNÁN",
    value: "employ",
    employedStatus: "employed",
    variant: "success",
  },
];

export type Status =
  | "save"
  | "wait-for-response"
  | "invite-for-next-round"
  | "employ"
  | "reject"
  | undefined;

export type FormValues = {
  status: Status;
  note: string;
};

export type FormControlProps = {
  register: UseFormRegister<FormValues>;
  watch: UseFormWatch<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  onSubmit: () => void;
};

const StatusButton = ({
  label,
  value,
  variant,
  selected,
  onClick,
}: {
  label: string;
  value: string | string[];
  variant: string;
  selected: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-center border-2 transition-all",
        selected && [
          "text-white",
          variant === "destructive" && "bg-red-600 border-red-600",
          variant === "secondary" && "bg-sky-600 border-sky-600",
          variant === "success" && "bg-green border-green",
        ],
        !selected && variantClasses[variant as keyof typeof variantClasses]
      )}
    >
      {label}
    </button>
  );
};

type ContactCandidateDialogProps = {
  isOpen: boolean;
  setIsOpen: Dispatch<boolean>;
  candidate?: Partial<CandidateUserProfile>;
  application: Application;
  option: "database" | "webapp";
} & FormControlProps;

export const ContactCandidateDialog = ({
  isOpen,
  setIsOpen,
  candidate,
  application,
  register,
  watch,
  setValue,
  onSubmit,
}: ContactCandidateDialogProps) => {
  if (!candidate) {
    return null;
  }

  const status = watch("status");
  const note = watch("note");
  // Local state to remember selections when modal is closed
  const [localStatus, setLocalStatus] = useState<Status>(
    (application.employerStatement as unknown as Status) || undefined
  );
  const [localNote, setLocalNote] = useState(application.note || "");

  const closedBySubmit = useRef(false);
  const initialStatusRef = useRef<Status>();
  const initialNoteRef = useRef<string>("");

  useEffect(() => {
    if (isOpen) {
      initialStatusRef.current = localStatus;
      initialNoteRef.current = localNote;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      if (closedBySubmit.current) {
        closedBySubmit.current = false;
      } else {
        setLocalStatus(
          (application.employerStatement as unknown as Status) || undefined
        );
        setLocalNote(application.note || "");
        setValue("status", application.employerStatement as unknown as Status);
        setValue("note", application.note || "");
      }
    }
  }, [isOpen, setValue, application]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalNote(value);
    register("note").onChange(e);
  };

  const handleStatusChange = (newStatus: Status) => {
    setLocalStatus(newStatus);
    setValue("status", newStatus);
  };

  const handleSubmit = () => {
    closedBySubmit.current = true;
    onSubmit();
    setLocalStatus(undefined);
    setLocalNote("");
    setIsOpen(false);
    queryClient.invalidateQueries({ queryKey: [API_KEYS.MY_JOB_DETAIL] });
    queryClient.refetchQueries({ queryKey: [API_KEYS.MY_JOB_DETAIL] });
  };

  const formattedPhone = useMemo(() => {
    if (!candidate?.phone) return "";

    const cleanPhone = candidate.phone.replace(/\s/g, "").replace(/\//g, "");
    return cleanPhone.replace(/(\d{3})(?=\d)/g, "$1 ");
  }, [candidate?.phone]);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="max-w-2xl"
        onPointerDownOutside={(e) => {

          if (
            (localStatus !== initialStatusRef.current ||
              localNote !== initialNoteRef.current) &&
            !closedBySubmit.current
          ) {
            if (
              !window.confirm(
                "Máte neuložené změny. Opravdu si přejete pokračovat bez uložení?"
              )
            ) {
              e.preventDefault();
              return;
            }
            setLocalStatus(
              (application.employerStatement as unknown as Status) || undefined
            );
            setLocalNote(application.note || "");
            setValue(
              "status",
              application.employerStatement as unknown as Status
            );
            setValue("note", application.note || "");
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            Kontaktujte uchazeče: {candidate?.givenName} {candidate?.familyName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-gray-600">
            Zavolejte uchazeči na{" "}
            <span className="font-bold text-green-600">{formattedPhone}</span>
            {candidate?.email && (
              <>
                <br />
                nebo napište na{" "}
                <span className="font-bold text-green-600">
                  {candidate.email}
                </span>
              </>
            )}
          </p>

          <div className="flex flex-wrap gap-2">
            {statusOptions.map(({ label, value, variant, employedStatus }) => (
              <StatusButton
                key={value}
                label={label}
                value={value}
                variant={variant}
                selected={status === value || status === employedStatus}
                onClick={() => handleStatusChange(value as Status)}
              />
            ))}
          </div>

          <div className="space-y-2">
            <label htmlFor="note" className="text-sm text-gray-600">
              Poznámka (pouze pro vás, uchazeči nevidí)
            </label>
            <Textarea
              id="note"
              placeholder="Poznámka pro mě (nepovinné)"
              {...register("note")}
              onChange={handleNoteChange}
              value={note}
            />
          </div>

          <Button className="w-full mt-4" onClick={handleSubmit}>
            Uložit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
