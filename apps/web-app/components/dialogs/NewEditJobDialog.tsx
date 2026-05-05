"use client";
import { Button } from "@ui/components/core/button";
import { Checkbox } from "@ui/components/core/checkbox";
import { DatePicker } from "@ui/components/core/DatePicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ui/components/core/dialog";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupLabel,
} from "@ui/components/core/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@ui/components/core/select";
import { Textarea } from "@ui/components/core/textarea";
import { ToastAction } from "@ui/components/core/toast";
import { getJobTypeFromPathname, getJobTypeLabel } from "@ui/helpers";
import { API } from "@ui/hooks";
import { useToast } from "@ui/hooks/use-toast";
import { useTokenRestore } from "@ui/hooks/useTokenRestore";
import { cn } from "@ui/lib/utils";
import { queryClient } from "@ui/Providers/ServerProvider";
import { API_KEYS } from "@ui/types/api_keys";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  CreateJobInput,
  Job,
  JOB_TERM,
  TIME_FLEXIBILITY,
  TIME_PERIOD,
} from "quickjobs-api-wrapper";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Autocomplete from "react-google-autocomplete";
import { useForm } from "react-hook-form";
import { TipsLink } from "../MyJobs/MyJobsInfoBar";
import { AreYouSureDialog } from "./AreYouSureDialog";
import { JobHistoryDialogView } from "./JobHistoryDialogView";

const formatDateTime = (date: Date, timeString: string | undefined): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const time = timeString || "12:00";
  return `${year}-${month}-${day}T${time}`;
};

const convertPayloadToSnakeCase = (payload: any) => {
  const snakeCasePayload: { [key: string]: any } = {};
  for (const key in payload) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const snakeKey = key.replace(
        /[A-Z]/g,
        (letter) => `_${letter.toLowerCase()}`
      );
      snakeCasePayload[snakeKey] = payload[key];
    }
  }
  return snakeCasePayload;
};

interface NewJobDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  isEditingDescription?: boolean;
  setIsEditingDescription?: (editing: boolean) => void;
  job?: Partial<Job>;
  isSimilarJob?: boolean;
}

interface FormFields {
  eventDate: Date | undefined;
  startDate: Date | undefined;
  startDateOption: "as_soon_as_possible" | "select_date";
  customRequirement: string;
  location: string;
  offers: string;
  timePeriod?: TIME_PERIOD;
  timeFlexibility?: TIME_FLEXIBILITY;
}

const initialRequirements = [
  "Angličtina",
  "Znalost MS Office",
  "SŠ vzdělání",
  "Min. 20h/týdně",
  "Řidičský průkaz sk. B",
];

type DialogView = "form" | "history";

const JOB_TYPE_TO_TERM: Record<string, JOB_TERM> = {
  oneTime: JOB_TERM.ONE_TIME,
  fullTime: JOB_TERM.FULL_TIME,
  longTerm: JOB_TERM.LONG_TERM,
};

const getApiError = (
  error: any
): { type?: string; message?: string } | null => {
  if (!error) return null;
  // The API wrapper likely throws an error object that has a `response` property
  // containing the server's response. Let's access it safely.
  const errorResponse = error.response;
  if (
    errorResponse &&
    Array.isArray(errorResponse.errors) &&
    errorResponse.errors.length > 0
  ) {
    return errorResponse.errors[0];
  }
  // Fallback for other potential structures
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors[0];
  }
  return null;
};

export const NewJobDialog = ({
  open,
  setOpen,
  isEditingDescription = false,
  setIsEditingDescription = () => { },
  job,
  isSimilarJob = false,
}: NewJobDialogProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { restoreToken } = useTokenRestore();
  const jobType = getJobTypeFromPathname(pathname);
  const googleApiKey = "AIzaSyCSKRNCiGmdtrmXdhObv-O3Z4Pltog60bY";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [showPublishConfirmation, setShowPublishConfirmation] = useState(false);
  const [pendingSubmissionData, setPendingSubmissionData] =
    useState<CreateJobInput | null>(null);

  const [currentView, setCurrentView] = useState<DialogView>("form");
  const prevOpenRef = useRef(open);
  const prevJobRef = useRef<string | undefined>();
  const prevIsEditingRef = useRef(isEditingDescription);
  const prevIsSimilarRef = useRef(isSimilarJob);

  const jobTerm = JOB_TYPE_TO_TERM[jobType];

  const [formFields, setFormFields] = useState<FormFields>({
    eventDate:
      new Date(new Date().setDate(new Date().getDate() + 1)) || undefined,
    startDate:
      new Date(new Date().setDate(new Date().getDate() + 1)) || undefined,
    startDateOption: "as_soon_as_possible",
    customRequirement: "",
    location: job?.place?.address ?? "",
    offers: job?.benefits ?? "",
    timePeriod: jobType === "fullTime" ? TIME_PERIOD.INDEFINITE : undefined,
    timeFlexibility:
      jobType === "fullTime" ? TIME_FLEXIBILITY.FLEXIBLE : undefined,
  });

  const MAX_DESCRIPTION_LENGTH = jobType === "oneTime" ? 400 : 1500;

  const [requirementsList, setRequirementsList] = useState(initialRequirements);
  const [checkedRequirements, setCheckedRequirements] = useState<string[]>([]);
  const {
    handleSubmit,
    reset,
    register,
    setValue,
    watch,
    getValues,
    trigger,
    formState: { errors, isValid },
  } = useForm<CreateJobInput>({
    mode: "onBlur",
    defaultValues: {
      description: job?.description ?? "",
      gender: job?.gender ?? "any",
      doesStartImmediately: job?.doesStartImmediately ?? true,
      place: {
        address: job?.place?.address ?? "",
        latitude: job?.place?.latitude ?? 0,
        longitude: job?.place?.longitude ?? 0,
      },
      timePeriod: jobType === "fullTime" ? TIME_PERIOD.INDEFINITE : undefined,
      term: JOB_TERM.ONE_TIME,
      salary: job?.salary ?? undefined,
      salaryTo: job?.salaryTo ?? undefined,
      salaryType: job?.salaryType ?? "hour",
      requirements: job?.requirements ?? [],
      benefits: job?.benefits ?? "",
      timeFlexibility:
        jobType === "fullTime" ? TIME_FLEXIBILITY.FLEXIBLE : undefined,
      startsAt: undefined,
      endsAt: undefined,
    },
  });

  const updateFormField = <K extends keyof FormFields>(
    key: K,
    value: FormFields[K]
  ) => {
    if ((key === "eventDate" || key === "startDate") && value instanceof Date) {
      const now = new Date();
      const selectedDate = new Date(value);
      const tomorrow = new Date(now);

      selectedDate.setHours(0, 0, 0, 0);
      tomorrow.setHours(0, 0, 0, 0);

      if (selectedDate < tomorrow) {
        const currentTime = value.getHours() * 60 + value.getMinutes();
        const newDate = new Date(new Date().setDate(new Date().getDate() + 1));

        if (currentTime > 0) {
          newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
        }

        value = newDate as FormFields[K];
      }
    }

    setFormFields((prev) => ({ ...prev, [key]: value }));

    // If changing startDateOption, also directly update doesStartImmediately field
    if (key === "startDateOption") {
      setValue("doesStartImmediately", value === "as_soon_as_possible", {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  // Add CSS to the document to ensure global styling for pac-container
  useEffect(() => {
    // Add a style element to fix Google autocomplete dropdown click issues
    const style = document.createElement("style");
    style.innerHTML = `
      .pac-container {
        z-index: 9999 !important; 
        pointer-events: auto !important;
        cursor: pointer !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        border-radius: 0.375rem !important;
        margin-top: 0.25rem !important;
        border: 1px solid #e5e7eb !important;
        background-color: white !important;
      }
      .pac-item {
        cursor: pointer !important;
        padding: 0.5rem !important;
      }
      .pac-item:hover {
        background-color: #f3f4f6 !important;
      }
    `;
    document.head.appendChild(style);

    // Prevent clicks on pac-container from closing the dialog
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click target is inside a pac-container or pac-item
      if (
        target.closest(".pac-container") ||
        target.classList.contains("pac-item") ||
        target.classList.contains("pac-item-query")
      ) {
        e.stopPropagation();
      }
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.head.removeChild(style);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  useEffect(() => {
    const stringifiedJob = JSON.stringify(job);

    // Helper: get tomorrow
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Helper: get valid date (never in past)
    const getValidDate = (date: Date | string | undefined) => {
      if (!date) return tomorrow;
      const d = typeof date === "string" ? new Date(date) : new Date(date);
      d.setHours(0, 0, 0, 0);
      if (d < tomorrow) return tomorrow;
      return d;
    };

    if (
      open &&
      (!prevOpenRef.current ||
        stringifiedJob !== prevJobRef.current ||
        isEditingDescription !== prevIsEditingRef.current ||
        isSimilarJob !== prevIsSimilarRef.current)
    ) {
      setCurrentView("form");

      let initialStartDateOption: "select_date" | "as_soon_as_possible";
      if (job?.startsAt) {
        initialStartDateOption = "select_date";
      } else if (job?.doesStartImmediately === false) {
        initialStartDateOption = "select_date";
      } else {
        initialStartDateOption = "as_soon_as_possible";
      }
      const initialDoesStartImmediately =
        initialStartDateOption === "as_soon_as_possible";

      const validEventDate = isSimilarJob
        ? new Date(new Date().setDate(new Date().getDate() + 1))
        : !isSimilarJob && job?.startsAt && jobType === "oneTime"
          ? getValidDate(job.startsAt)
          : !isSimilarJob && job?.endsAt && jobType === "oneTime"
            ? getValidDate(job.endsAt)
            : tomorrow;

      const validStartDate = isSimilarJob
        ? new Date(new Date().setDate(new Date().getDate() + 1))
        : !isSimilarJob && job?.startsAt && jobType !== "oneTime"
          ? getValidDate(job.startsAt)
          : tomorrow;

      // Reset form - we're inside this block only when something relevant changed
      reset({
        description: job?.description ?? "",
        gender: job?.gender ?? "any",
        doesStartImmediately: isSimilarJob
          ? true
          : (job?.doesStartImmediately ?? initialDoesStartImmediately),
        place: {
          address: job?.place?.address ?? "",
          latitude: job?.place?.latitude ?? 0,
          longitude: job?.place?.longitude ?? 0,
        },
        timePeriod:
          job?.timePeriod ??
          (jobType === "fullTime" ? TIME_PERIOD.INDEFINITE : undefined),
        term: job?.term ?? JOB_TYPE_TO_TERM[jobType],
        salary: job?.salary ?? undefined,
        salaryTo: job?.salaryTo ?? undefined,
        salaryType: job?.salaryType ?? "hour",
        requirements: job?.requirements ?? [],
        benefits: job?.benefits ?? "",
        timeFlexibility:
          job?.timeFlexibility ??
          (jobType === "fullTime" ? TIME_FLEXIBILITY.FLEXIBLE : undefined),
        startsAt: isSimilarJob ? "" : undefined,
        endsAt: isSimilarJob ? "" : undefined,
      });

      // Update form fields - always update when we're in this block
      setFormFields({
        eventDate: validEventDate,
        startDate: validStartDate,
        startDateOption: isSimilarJob
          ? "as_soon_as_possible"
          : initialStartDateOption,
        customRequirement: "",
        location: job?.place?.address ?? "",
        offers: job?.benefits ?? "",
        timePeriod:
          job?.timePeriod ??
          (jobType === "fullTime" ? TIME_PERIOD.INDEFINITE : undefined),
        timeFlexibility:
          job?.timeFlexibility ??
          (jobType === "fullTime" ? TIME_FLEXIBILITY.FLEXIBLE : undefined),
      });

      const effectiveRequirements = job?.requirements ?? [];
      setCheckedRequirements(effectiveRequirements);
      setRequirementsList([
        ...new Set([...initialRequirements, ...effectiveRequirements]),
      ]);
    }

    prevOpenRef.current = open;
    prevJobRef.current = stringifiedJob;
    prevIsEditingRef.current = isEditingDescription;
    prevIsSimilarRef.current = isSimilarJob;
  }, [
    open,
    job,
    jobType,
    reset,
    initialRequirements,
    JOB_TYPE_TO_TERM,
    setCurrentView,
    setFormFields,
    setCheckedRequirements,
    setRequirementsList,
    isEditingDescription,
    isSimilarJob,
  ]);

  // Load from local storage on open
  useEffect(() => {

    if (open && !job && !isSimilarJob && !isEditingDescription) {
      const savedJobJSON = localStorage.getItem(`pendingJobOffer_${jobType}`);

      if (savedJobJSON) {
        try {
          const savedData = JSON.parse(savedJobJSON);

          // Check if it's new format with formFields and checkedRequirements
          if (savedData.formFields && savedData.checkedRequirements !== undefined) {
            // New format - restore everything
            reset({
              description: savedData.description || "",
              gender: savedData.gender || "any",
              doesStartImmediately: savedData.doesStartImmediately ?? true,
              place: savedData.place || { address: "", latitude: 0, longitude: 0 },
              timePeriod: savedData.timePeriod,
              term: savedData.term || JOB_TYPE_TO_TERM[jobType],
              salary: savedData.salary,
              salaryTo: savedData.salaryTo,
              salaryType: savedData.salaryType || "hour",
              requirements: savedData.requirements || [],
              benefits: savedData.benefits || "",
              timeFlexibility: savedData.timeFlexibility,
              startsAt: savedData.startsAt,
              endsAt: savedData.endsAt,
            });

            // Restore form fields
            setFormFields(savedData.formFields);

            // Restore requirements
            setCheckedRequirements(savedData.checkedRequirements || []);
            const allRequirements = [
              ...initialRequirements,
              ...(savedData.checkedRequirements || []).filter(
                (req: string) => !initialRequirements.includes(req)
              )
            ];
            setRequirementsList([...new Set(allRequirements)]);
          } else {
            // Old format - convert to Job and use existing handler
            const convertedJob: Job = {
              id: savedData.id,
              description: savedData.description || "",
              gender: savedData.gender || "any",
              doesStartImmediately: savedData.doesStartImmediately ?? true,
              place: savedData.place || { address: "", latitude: 0, longitude: 0 },
              timePeriod: savedData.timePeriod,
              term: savedData.term || JOB_TYPE_TO_TERM[jobType],
              salary: savedData.salary,
              salaryTo: savedData.salaryTo,
              salaryType: savedData.salaryType || "hour",
              requirements: savedData.requirements || [],
              benefits: savedData.benefits || "",
              timeFlexibility: savedData.timeFlexibility,
              startsAt: savedData.startsAt,
              endsAt: savedData.endsAt,
            } as Job;
            handlePopulateFormFromHistory(convertedJob);
          }
        } catch (error) {
          console.warn('Failed to parse saved job data:', error);
          localStorage.removeItem(`pendingJobOffer_${jobType}`);
        }
      }
    }
  }, [open, jobType, job, isSimilarJob, isEditingDescription]);

  // Trigger validation when salaryType changes
  const salaryType = watch("salaryType");
  useEffect(() => {
    if (salaryType) {
      trigger(["salary", "salaryTo"]);
    }
  }, [salaryType, trigger]);

  // Handle place selection with coordinates
  const handlePlaceSelected = useCallback(
    (place: any) => {
      if (place && place.formatted_address) {
        // Update UI field
        updateFormField("location", place.formatted_address);

        // Extract coordinates if available
        let latitude = 0;
        let longitude = 0;

        if (place.geometry && place.geometry.location) {
          try {
            latitude = place.geometry.location.lat();
            longitude = place.geometry.location.lng();
          } catch (e) {
            console.error("Error getting coordinates:", e);
          }
        }

        // Set place data directly in form
        setValue(
          "place",
          {
            address: place.formatted_address,
            latitude,
            longitude,
          },
          {
            shouldValidate: true,
            shouldDirty: true,
          }
        );
      }
    },
    [setValue]
  );

  const handleRequirementChange = (value: string) => {
    const isChecked = checkedRequirements.includes(value);

    // Update checked requirements
    setCheckedRequirements((prev) =>
      isChecked ? prev.filter((item) => item !== value) : [...prev, value]
    );

    // If unchecking and it's not an initial requirement, remove from list
    if (isChecked && !initialRequirements.includes(value)) {
      setRequirementsList((prev) => prev.filter((item) => item !== value));
    }
  };

  const handleCustomRequirement = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = formFields.customRequirement.trim();

      if (!value) return;

      const existsInList = requirementsList.includes(value);

      if (!existsInList) {
        setRequirementsList((prev) => [...prev, value]);
      }

      if (!checkedRequirements.includes(value)) {
        setCheckedRequirements((prev) => [...prev, value]);
      }

      updateFormField("customRequirement", "");
    }
  };

  const performJobCreation = useCallback(
    async (payload: CreateJobInput, isRetry = false) => {
      setIsSubmitting(true);
      try {
        const response = await API.jobs.createJobOffer(payload);
        // On success, clear local storage and invalidate queries.
        localStorage.removeItem(`pendingJobOffer_${jobType}`);

        queryClient.invalidateQueries({
          queryKey: [API_KEYS.MY_JOBS, API_KEYS.MY_JOB_DETAIL],
        });
        await queryClient.invalidateQueries({ queryKey: [API_KEYS.MY_JOBS] });
        await queryClient.refetchQueries({ queryKey: [API_KEYS.MY_JOBS] });

        const jobId = (response as any)?.data?.id;

        if (jobId) {
          const urlJobType = jobType.replace(/([A-Z])/g, "-$1").toLowerCase();
          router.push(
            `/dashboard/jobs/${urlJobType === "long-time"
              ? "long-time"
              : urlJobType.includes("term")
                ? "long-time"
                : urlJobType
            }/${jobId}`
          );
        }

        toast({
          title: "Úspěch",
          description: "Inzerát byl úspěšně vytvořen a zveřejněn.",
        });

        setOpen(false);
      } catch (error: any) {
        const apiError = getApiError(error);
        if (apiError?.message?.includes("Passed date is in a past")) {
          toast({
            variant: "destructive",
            title: "Chyba",
            description:
              "Zadané datum je v minulosti. Vyberte prosím platné datum.",
          });
          return;
        }

        if (apiError?.type === "token_expired" && !isRetry) {
          try {
            const restored = await restoreToken();
            if (restored) {
              await performJobCreation(payload, true); // Retry the operation
              return; // Exit after retry attempt
            }
          } catch (restoreError) {
            console.error(
              "Token restore failed after job creation failure:",
              restoreError
            );
          }
          // If restore fails, fall through to the generic error toast.
          toast({
            variant: "destructive",
            title: "Chyba přihlášení",
            description:
              "Nepodařilo se obnovit sezení. Přihlaste se prosím znovu.",
          });
        } else if (apiError?.type === "job_out_of_credit") {
          localStorage.setItem(
            `pendingJobOffer_${jobType}`,
            JSON.stringify(payload)
          );
          setOpen(false);
          toast({
            variant: "destructive",
            title: "Nemáte dostupné inzeráty",
            action: (
              <ToastAction
                altText="Získat"
                onClick={() =>
                  router.push(`/dashboard/pricing?jobType=${jobType}`)
                }
              >
                ZÍSKAT
              </ToastAction>
            ),
          });
        } else {
          console.error("Unknown error creating job:", error);
          toast({
            variant: "destructive",
            title: "Vyskytla se neznámá chyba.",
            description: apiError?.message,
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      jobType,
      queryClient,
      restoreToken,
      router,
      setOpen,
      toast,
      setIsSubmitting,
    ]
  );

  const onSubmit = (data: CreateJobInput) => {
    // If editing description, show confirmation first
    if (isEditingDescription && job?.id) {
      setShowUpdateConfirmation(true);
      return;
    }

    const payload: CreateJobInput = {
      ...data,
      requirements: checkedRequirements,
      benefits: formFields.offers,
    };

    const getTimePart = (value: string | undefined) =>
      value ? value.split("T")[1] || value : "00:00";

    // Fix startsAt and endsAt to never be invalid or empty string
    if (formFields.startDateOption === "select_date") {
      payload.startsAt = data.startsAt && formFields.startDate
        ? formatDateTime(
          formFields.startDate as Date,
          getTimePart(data.startsAt as string)
        )
        : formatDateTime(
          new Date(new Date().setDate(new Date().getDate() + 1)),
          getTimePart(data.startsAt as string)
        );
    } else {
      payload.startsAt = formatDateTime(
        new Date(new Date().setDate(new Date().getDate() + 1)),
        undefined
      );
    }

    if (jobType === "oneTime") {
      payload.startsAt = data.startsAt && formFields.eventDate
        ? formatDateTime(
          formFields.eventDate as Date,
          getTimePart(data.startsAt as string)
        )
        : undefined;
      payload.endsAt = data.endsAt && formFields.eventDate
        ? formatDateTime(
          formFields.eventDate as Date,
          getTimePart(data.endsAt as string)
        )
        : undefined;
    } else {
      // For non-oneTime, ensure endsAt is null if not set
      payload.endsAt = data.endsAt ? data.endsAt : undefined;
    }

    // Show publish confirmation instead of directly creating
    setPendingSubmissionData(payload);
    setShowPublishConfirmation(true);
  };

  const handleUpdateConfirm = () => {
    const data = watch(); // Get current form data
    setIsSubmitting(true);
    if (job?.id) {
      API.jobs
        .updateDescription(job.id, data.description)
        .then(() => {
          toast({
            title: "Úspěch",
            description: "Popis inzerátu byl úspěšně aktualizován.",
          });
          queryClient.invalidateQueries({
            queryKey: [API_KEYS.MY_JOBS, job.term],
          });
          queryClient.invalidateQueries({
            queryKey: [API_KEYS.MY_JOB_DETAIL, job.id?.toString()],
          });
          queryClient.refetchQueries({
            queryKey: [API_KEYS.MY_JOBS, job.term],
          });
          setOpen(false);
          setIsEditingDescription(false);
          setShowUpdateConfirmation(false);
        })
        .catch((error: unknown) => {
          console.error("Error updating description:", error);
          toast({
            title: "Chyba",
            description: "Nepodařilo se aktualizovat popis inzerátu.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  const handlePublishConfirm = () => {
    if (pendingSubmissionData) {
      setShowPublishConfirmation(false);
      performJobCreation(pendingSubmissionData);
      setPendingSubmissionData(null);
    }
  };

  // Add function to handle populating form from historical job
  const handlePopulateFormFromHistory = useCallback(
    (selectedJob: Job) => {
      // Reset form first
      reset();

      // Populate form with selected job data
      setValue("description", selectedJob.description || "");
      setValue("gender", selectedJob.gender || "any");
      setValue(
        "doesStartImmediately",
        selectedJob.doesStartImmediately ?? true
      );
      setValue("place", {
        address: selectedJob.place?.address || "",
        latitude: selectedJob.place?.latitude || 0,
        longitude: selectedJob.place?.longitude || 0,
      });
      setValue("timePeriod", selectedJob.timePeriod || undefined);
      setValue("term", selectedJob.term);
      setValue("salary", selectedJob.salary || 0);
      setValue("salaryTo", selectedJob.salaryTo || 0);
      setValue("salaryType", selectedJob.salaryType || "hour");
      setValue("requirements", selectedJob.requirements || []);
      setValue("benefits", selectedJob.benefits || "");
      setValue("timeFlexibility", selectedJob.timeFlexibility || undefined);
      setValue("startsAt", selectedJob.startsAt || "");
      setValue("endsAt", selectedJob.endsAt || "");

      // Update form fields
      setFormFields((prev) => ({
        ...prev,
        startDateOption: selectedJob.startsAt
          ? "select_date"
          : "as_soon_as_possible",
        location: selectedJob.place?.address || "",
        offers: selectedJob.benefits || "",
        timePeriod: selectedJob.timePeriod || undefined,
        timeFlexibility: selectedJob.timeFlexibility || undefined,
      }));

      // Set requirements
      setCheckedRequirements(selectedJob.requirements || []);

      // Add any requirements that aren't in the initial list
      const newRequirements = (selectedJob.requirements || []).filter(
        (req) => !initialRequirements.includes(req)
      );
      if (newRequirements.length > 0) {
        setRequirementsList((prev) => [...prev, ...newRequirements]);
      }

      // Switch back to form view
      setCurrentView("form");
    },
    [setValue, reset, initialRequirements]
  );

  const getTomorrow = () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() + 1);
    return t;
  };

  // UI components for date selection
  const renderDateSelection = () => {
    const tomorrow = getTomorrow();
    if (jobType === "oneTime") {
      return (
        <div className="flex gap-2 items-center">
          <div
            className={`flex-1 ${isEditingDescription ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Label>Datum konání</Label>
            <DatePicker
              value={formFields.eventDate}
              onChange={(date) => {
                if (date) {
                  updateFormField("eventDate", date);
                  setValue('startsAt', formatDateTime(date, "12:00"));
                }
              }}

              placeholder="Vyberte datum konání"
              disablePastDates={true}
            />
          </div>
          <div
            className={`w-28 ${isEditingDescription ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Label htmlFor="startTime">Čas začátku</Label>
            <Input
              error={errors.startsAt?.message}
              id="startTime"
              type="time"
              placeholder="00:00"
              disabled={isEditingDescription}
              {...register("startsAt", {
                required: !isEditingDescription ? "Povinné" : false,
                validate: {
                  notInPast: (value: string | Date | undefined) => {
                    if (
                      isEditingDescription ||
                      !value ||
                      typeof value !== "string"
                    )
                      return true;
                    const now = new Date();
                    const selectedDate = new Date(formFields.eventDate as Date);
                    const parts = value.split(":");
                    if (parts.length < 2) return true;

                    const hours = parseInt(parts[0] || "0", 10) || 0;
                    const minutes = parseInt(parts[1] || "0", 10) || 0;

                    // Set the hours and minutes to the selected date
                    selectedDate.setHours(hours, minutes);

                    // Compare with current date
                    return selectedDate > now || "Čas nemůže být v minulosti";
                  },
                },
              })}
            />
          </div>
          <div
            className={`w-28 ${isEditingDescription ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Label htmlFor="endTime">Čas konce</Label>
            <Input
              error={errors.endsAt?.message}
              id="endTime"
              type="time"
              placeholder="00:00"
              disabled={isEditingDescription}
              {...register("endsAt", {
                required: !isEditingDescription ? "Povinné" : false,
                validate: {
                  isAtLeastOneHourDifference: (
                    endValue: string | Date | undefined
                  ) => {
                    if (!endValue || typeof endValue !== "string") return true;
                    const startValue = watch("startsAt");
                    if (!startValue || typeof startValue !== "string")
                      return true;
                    const [startHours, startMinutes] = startValue
                      .split(":")
                      .map(Number);
                    const [endHours, endMinutes] = endValue
                      .split(":")
                      .map(Number);

                    if (
                      isNaN(startHours ?? 0) ||
                      isNaN(startMinutes ?? 0) ||
                      isNaN(endHours ?? 0) ||
                      isNaN(endMinutes ?? 0)
                    ) {
                      return true;
                    }

                    const startTotalMinutes =
                      (startHours ?? 0) * 60 + (startMinutes ?? 0);
                    let endTotalMinutes =
                      (endHours ?? 0) * 60 + (endMinutes ?? 0);

                    // Handle overnight shifts
                    if (endTotalMinutes < startTotalMinutes) {
                      endTotalMinutes += 24 * 60; // add 24 hours
                    }

                    return (
                      endTotalMinutes - startTotalMinutes >= 60 ||
                      "Rozmezí min. 60 minut"
                    );
                  },
                },
              })}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className={cn(isEditingDescription && "text-gray-300")}>
            Termín nástupu
          </Label>
          <Select
            onValueChange={(value) =>
              updateFormField(
                "startDateOption",
                value as "as_soon_as_possible" | "select_date"
              )
            }
            defaultValue={formFields.startDateOption}
            value={formFields.startDateOption}
            disabled={isEditingDescription}
          >
            <SelectTrigger>
              {formFields.startDateOption === "as_soon_as_possible"
                ? "Co nejdříve"
                : "Vybrat datum"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="as_soon_as_possible">Co nejdříve</SelectItem>
              <SelectItem value="select_date">Vybrat datum</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formFields.startDateOption === "select_date" && (
          <div className="flex-1">
            <DatePicker
              value={formFields.startDate}
              onChange={(date) => {
                if (date) {
                  updateFormField("startDate", date);
                  setValue("startsAt", formatDateTime(date, "12:00"));
                }
              }}
              placeholder="Vyberte datum nástupu"
              disabled={isEditingDescription}
              disablePastDates={true}
            />
          </div>
        )}
      </div>
    );
  };

  const renderRequirements = () => (
    <>
      <Label className={cn(isEditingDescription && "text-gray-300")}>
        Požadujeme
      </Label>
      {requirementsList.map((item, index) => (
        <div key={`${isEditingDescription}_${item}_${index}`} className="flex items-center gap-2">
          <Checkbox
            className="data-[state=checked]:text-white"
            checked={checkedRequirements.includes(item)}
            onCheckedChange={() => handleRequirementChange(item)}
            id={item}
            disabled={isEditingDescription}
          />
          <label
            htmlFor={item}
            className={cn(isEditingDescription && "text-gray-300")}
          >
            {item}
          </label>
        </div>
      ))}

      <Input
        id="customRequirement"
        placeholder="Vložte vlastní požadavek"
        value={formFields.customRequirement}
        onChange={(e) => updateFormField("customRequirement", e.target.value)}
        onKeyDown={handleCustomRequirement}
        disabled={isEditingDescription}
      />
      {formFields.customRequirement && (
        <p className="text-xs text-gray-500 -mt-2">Potvrďte enterem</p>
      )}
    </>
  );

  const handleOpenChange = useCallback(
    (newOpenState: boolean) => {

      if (!newOpenState) {
        // Save form state to localStorage on close (but not for editing or similar job)
        if (!isEditingDescription && !isSimilarJob) {
          const currentFormData = watch();

          const hasContent =
            currentFormData.description?.length > 0 ||
            currentFormData.place?.address?.length > 0 ||
            (currentFormData.salary && currentFormData.salary > 0) ||
            checkedRequirements.length > 0 ||
            formFields.offers?.length > 0;

          if (hasContent) {
            const dataToSave = {
              ...currentFormData,
              formFields,
              checkedRequirements,
              timestamp: Date.now(),
            };
            try {
              localStorage.setItem(`pendingJobOffer_${jobType}`, JSON.stringify(dataToSave));
            } catch (error) {
            }
          }
        }
        // If dialog is closing
        setCurrentView("form");
      }
      setOpen(newOpenState); // Propagate to parent/controlling state
    },
    [setOpen, setCurrentView, isEditingDescription, isSimilarJob, watch, formFields, checkedRequirements, jobType]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent
        className={cn(
          "max-w-4xl",
          jobType === "oneTime" && "max-w-2xl",
          currentView === "history" && "max-w-4xl h-[80vh] flex flex-col",
          currentView === "history"
            ? "max-h-[90vh] overflow-x-hidden"
            : "max-h-[90vh] overflow-y-auto overflow-x-hidden"
        )}
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking on autocomplete dropdown
          if (
            (e.target as HTMLElement).closest(".pac-container") ||
            (e.target as HTMLElement).classList.contains("pac-item") ||
            (e.target as HTMLElement).classList.contains("pac-item-query")
          ) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <div className="flex gap-4 items-center flex-wrap">
            <DialogTitle className="text-xl font-bold">
              {isEditingDescription
                ? "Upravit popis inzerátu"
                : isSimilarJob
                  ? "Vydat podobný inzerát"
                  : currentView === "history"
                    ? "Vyberte inzerát z historie"
                    : `Nový inzerát: ${getJobTypeLabel(jobType)}`}
            </DialogTitle>
            {currentView === "form" && (
              <span className="p-[2px_10px_3px] text-sm rounded-full bg-blue text-white">
                70 000+ studentů a absolventů | 1 000+ nových měsíčně
              </span>
            )}
            <TipsLink />
          </div>
        </DialogHeader>

        {currentView === "history" ? (
          jobTerm && (
            <JobHistoryDialogView
              jobTerm={jobTerm}
              onSelectJob={handlePopulateFormFromHistory}
              onBackToForm={() => setCurrentView("form")}
            />
          )
        ) : (
          <>
            <form
              id="jobForm"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-6 py-6",
                jobType === "oneTime" && "md:grid-cols-1"
              )}
            >
              <div className="flex flex-col gap-6 ">
                {isEditingDescription && (
                  <span className="text-sm bg-yellow-100 p-2 rounded-md">
                    <b>Upozornění:</b> Upravit můžete pouze popis inzerátu,
                    uživatelům nepřijde notifikace. Pokud chcete změnit i
                    ostatní údaje, je třeba vystavit nový inzerát. V rámci
                    garance 3 zájemců, pokud nemáte alespoň 3 zájemce, při
                    zrušení inzerátu vám kredit okamžitě vrátíme.
                  </span>
                )}
                <Label htmlFor="description">
                  Popis práce (volitelně i s chytlavým nadpisem)
                </Label>
                <div className="relative">
                  <Textarea
                    className="h-auto"
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    id="description"
                    placeholder="Chytlavý popis práce (smajlíci povoleni)"
                    {...register("description", {
                      required: "Popis je povinný",
                      minLength: {
                        value: 20,
                        message: "Popis musí být alespoň 20 znaků dlouhý",
                      },
                    })}
                    error={errors.description?.message}
                    onInput={(e) => {
                      const textarea = e.currentTarget;
                      // Reset height to auto to properly calculate required height
                      textarea.style.height = "auto";
                      // Set height to scrollHeight to expand based on content
                      textarea.style.height = `${textarea.scrollHeight}px`;
                    }}
                    rows={3}
                  />
                  <span className="text-sm text-gray-500 absolute right-0 -bottom-6">
                    {watch("description").length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>

                {renderDateSelection()}
                {jobType === "fullTime" && (
                  <div className="flex justify-between">
                    <div>
                      <Label
                        htmlFor="timePeriod"
                        className={cn(isEditingDescription && "text-gray-300")}
                      >
                        Na dobu
                      </Label>
                      <RadioGroup
                        disabled={isEditingDescription}
                        value={formFields.timePeriod}
                        onValueChange={(value: TIME_PERIOD) => {
                          updateFormField("timePeriod", value);
                          setValue("timePeriod", value);
                        }}
                        defaultValue="any"
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={TIME_PERIOD.DEFINITE}
                            id={TIME_PERIOD.DEFINITE}
                          />
                          <RadioGroupLabel
                            htmlFor={TIME_PERIOD.DEFINITE}
                            className={cn(
                              isEditingDescription && "text-gray-300"
                            )}
                          >
                            Určitou
                          </RadioGroupLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={TIME_PERIOD.INDEFINITE}
                            id={TIME_PERIOD.INDEFINITE}
                          />
                          <RadioGroupLabel
                            htmlFor={TIME_PERIOD.INDEFINITE}
                            className={cn(
                              isEditingDescription && "text-gray-300"
                            )}
                          >
                            <span className="underline">Ne</span>určitou
                          </RadioGroupLabel>
                        </div>
                      </RadioGroup>
                    </div>
                    <div>
                      <Label
                        htmlFor="timeFlexibility"
                        className={cn(isEditingDescription && "text-gray-300")}
                      >
                        Pracovní doba
                      </Label>
                      <RadioGroup
                        disabled={isEditingDescription}
                        value={formFields.timeFlexibility}
                        onValueChange={(value: TIME_FLEXIBILITY) => {
                          updateFormField("timeFlexibility", value);
                          setValue("timeFlexibility", value);
                        }}
                        defaultValue="any"
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={TIME_FLEXIBILITY.FIXED}
                            id={TIME_FLEXIBILITY.FIXED}
                          />
                          <RadioGroupLabel
                            htmlFor={TIME_FLEXIBILITY.FIXED}
                            className={cn(
                              isEditingDescription && "text-gray-300"
                            )}
                          >
                            Pevná
                          </RadioGroupLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={TIME_FLEXIBILITY.FLEXIBLE}
                            id={TIME_FLEXIBILITY.FLEXIBLE}
                          />
                          <RadioGroupLabel
                            htmlFor={TIME_FLEXIBILITY.FLEXIBLE}
                            className={cn(
                              isEditingDescription && "text-gray-300"
                            )}
                          >
                            Flexibilní
                          </RadioGroupLabel>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}
                <div>
                  <Label
                    htmlFor="location"
                    className={cn(isEditingDescription && "text-gray-300")}
                  >
                    Město, kde oslovit uživatele
                  </Label>
                  <div className="relative z-50">
                    <Autocomplete
                      apiKey={googleApiKey}
                      onPlaceSelected={handlePlaceSelected}
                      language="cs"
                      options={{
                        types: ["(cities)"],
                        componentRestrictions: { country: ["cz", "de", "sk"] },
                      }}
                      defaultValue={formFields.location}
                      className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                        errors.place && "border-red-500 text-red-500"
                      )}
                      placeholder="Praha, Česká republika"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        updateFormField("location", e.target.value);
                        // If field is cleared, reset the place value
                        if (!e.target.value) {
                          setValue("place", {
                            address: "",
                            latitude: 0,
                            longitude: 0,
                          });
                        }
                      }}
                      onBlur={() => {
                        // Validate when focus is lost
                        setValue("place", watch("place"), {
                          shouldValidate: true,
                        });
                      }}
                      disabled={isEditingDescription}
                    />
                    <input
                      type="hidden"
                      {...register("place", {
                        required: !isEditingDescription
                          ? "Město je povinné"
                          : false,
                        validate: {
                          hasAddress: (value) =>
                            isEditingDescription ||
                            (value &&
                              value.address &&
                              value.address.length > 0) ||
                            "Město je povinné",
                        },
                      })}
                    />
                    {errors.place && (
                      <p className="text-red-500 text-xs absolute -bottom-4 w-[300px]">
                        {errors.place.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="salary"
                    className={cn(isEditingDescription && "text-gray-300")}
                  >
                    Základní hrubá mzda
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      required
                      placeholder="min"
                      type="number"
                      error={errors.salary?.message}
                      className="w-28"
                      disabled={isEditingDescription}
                      {...register("salary", {
                        valueAsNumber: true,
                        required: !isEditingDescription
                          ? "Min. sazba je povinná"
                          : false,

                        validate: {
                          regex: (value: number | undefined) => {
                            if (
                              isEditingDescription ||
                              value === undefined ||
                              value === null ||
                              isNaN(value) // <-- allow empty field
                            )
                              return true;
                            return (
                              !isNaN(Number(value)) ||
                              "Pouze číselné hodnoty jsou povoleny"
                            );
                          },
                          maxHourlyWage: (value: number | undefined) => {
                            if (isEditingDescription) return true;
                            const salaryType = getValues("salaryType");
                            if (
                              salaryType === "hour" &&
                              value &&
                              value > 2000
                            ) {
                              return "Max. 2000 Kč/hod.";
                            }
                            return true;
                          },
                        },
                      })}
                    />
                    <span
                      className={cn(isEditingDescription && "text-gray-300")}
                    >
                      Kč
                    </span>
                    <div className="flex flex-col relative">
                      <Input
                        placeholder="max"
                        type="number"
                        error={errors.salaryTo?.message}
                        className="w-28"
                        notRequired={true}
                        disabled={isEditingDescription}
                        {...register("salaryTo", {
                          valueAsNumber: true,
                          required: false,
                          validate: {
                            regex: (value: number | undefined) => {
                              if (
                                isEditingDescription ||
                                value === undefined ||
                                value === null ||
                                isNaN(value)
                              )
                                return true;
                              return (
                                !isNaN(Number(value)) ||
                                "Pouze číselné hodnoty jsou povoleny"
                              );
                            },
                            maxHourlyWage: (value: number | undefined) => {
                              if (isEditingDescription) return true;
                              const salaryType = getValues("salaryType");
                              if (salaryType !== "hour" || !value || value <= 2000) {
                                return true;
                              }
                              return "Max. hodinová sazba je 2000 Kč";
                            },
                          },
                        })}
                      />
                    </div>
                    <span
                      className={cn(isEditingDescription && "text-gray-300")}
                    >
                      Kč
                    </span>
                    <div className="flex flex-col">
                      <Select
                        disabled={isEditingDescription}
                        value={watch("salaryType") || "hour"}
                        onValueChange={(value) => {
                          const newSalaryType = value as "hour" | "month" | "total";
                          setValue("salaryType", newSalaryType, { 
                            shouldValidate: false,
                            shouldDirty: true 
                          });
                          // Validation will be triggered by useEffect watching salaryType
                        }}
                      >
                        <SelectTrigger className="w-[120px]">
                          {watch("salaryType") === "hour" && "za hodinu"}
                          {watch("salaryType") === "month" && "za měsíc"}
                          {watch("salaryType") === "total" &&
                            (jobType === "fullTime" ? "celkem" : "za brigádu")}
                          {!watch("salaryType") && "za hodinu"}
                        </SelectTrigger>
                        <SelectContent>
                          {jobType === "fullTime" && (
                            <>
                              <SelectItem value="hour">za hodinu</SelectItem>
                              <SelectItem value="month">za měsíc</SelectItem>
                              <SelectItem value="total">celkem</SelectItem>
                            </>
                          )}
                          {jobType === "longTerm" && (
                            <>
                              <SelectItem value="hour">za hodinu</SelectItem>
                              <SelectItem value="total">za brigádu</SelectItem>
                            </>
                          )}
                          {jobType === "oneTime" && (
                            <>
                              <SelectItem value="hour">za hodinu</SelectItem>
                              <SelectItem value="total">za brigádu</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <Label
                    className={cn(isEditingDescription && "text-gray-300")}
                  >
                    Poslat na (nezobrazí se v inzerátu)
                  </Label>
                  <RadioGroup
                    value={watch("gender")}
                    onValueChange={(value) =>
                      setValue("gender", value as "male" | "female" | "any")
                    }
                    defaultValue="any"
                    className="flex gap-4"
                    disabled={isEditingDescription}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="any" id="muze-i-zeny" />
                      <RadioGroupLabel
                        htmlFor="muze-i-zeny"
                        className={cn(isEditingDescription && "text-gray-300")}
                      >
                        Muže i ženy
                      </RadioGroupLabel>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="muze" />
                      <RadioGroupLabel
                        htmlFor="muze"
                        className={cn(isEditingDescription && "text-gray-300")}
                      >
                        Muže
                      </RadioGroupLabel>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="zeny" />
                      <RadioGroupLabel
                        htmlFor="zeny"
                        className={cn(isEditingDescription && "text-gray-300")}
                      >
                        Ženy
                      </RadioGroupLabel>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {jobType !== "oneTime" && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    {renderRequirements()}
                  </div>
                  <div>
                    <Label
                      htmlFor="offers"
                      className={cn(isEditingDescription && "text-gray-300")}
                    >
                      Nabízíme (stravenky, dovolené, auto, telefon...)
                    </Label>
                    <div className="relative">
                      <Textarea
                        id="offers"
                        className="h-auto"
                        maxLength={1000}
                        placeholder=""
                        value={formFields.offers}
                        onChange={(e) =>
                          updateFormField("offers", e.target.value)
                        }
                        onInput={(e) => {
                          const textarea = e.currentTarget;
                          // Reset height to auto to properly calculate required height
                          textarea.style.height = "auto";
                          // Set height to scrollHeight to expand based on content
                          textarea.style.height = `${textarea.scrollHeight}px`;
                        }}
                        disabled={isEditingDescription}
                      />
                      <span className="text-sm text-gray-500 absolute right-0 -bottom-6">
                        {formFields.offers.length}/1000
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div
              className={cn(
                "flex justify-between mt-6",
                isEditingDescription && "flex-col gap-4 items-end"
              )}
            >
              {!isEditingDescription && (
                <>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setCurrentView("history")}
                    disabled={isEditingDescription}
                  >
                    Vybrat z historie
                  </Button>
                  <Button
                    disabled={isEditingDescription}
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      localStorage.removeItem(`pendingJobOffer_${jobType}`);
                      reset({
                        description: "",
                        gender: "any",
                        doesStartImmediately: true,
                        place: {
                          address: "",
                          latitude: 0,
                          longitude: 0,
                        },
                        timePeriod:
                          jobType === "fullTime"
                            ? TIME_PERIOD.INDEFINITE
                            : undefined,
                        term: JOB_TYPE_TO_TERM[jobType],
                        salary: undefined,
                        salaryTo: undefined,
                        salaryType: "hour",
                        requirements: [],
                        benefits: "",
                        timeFlexibility:
                          jobType === "fullTime"
                            ? TIME_FLEXIBILITY.FLEXIBLE
                            : undefined,
                        startsAt: "",
                        endsAt: "",
                      });
                      setFormFields({
                        eventDate: undefined,
                        startDate: undefined,
                        startDateOption: "as_soon_as_possible",
                        customRequirement: "",

                        location: "",
                        offers: "",
                        timePeriod:
                          jobType === "fullTime"
                            ? TIME_PERIOD.INDEFINITE
                            : undefined,
                        timeFlexibility:
                          jobType === "fullTime"
                            ? TIME_FLEXIBILITY.FLEXIBLE
                            : undefined,
                      });
                      // Reset requirements to initial state
                      setRequirementsList([...initialRequirements]);
                      setCheckedRequirements([]);
                    }}
                  >
                    Vyprázdnit formulář
                  </Button>
                </>
              )}
              <Button
                type="submit"
                form="jobForm"
                disabled={isSubmitting}
                className="uppercase"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEditingDescription
                  ? "Uložit změny"
                  : isSubmitting
                    ? "Vydáváme inzerát..."
                    : "Zveřejnit inzerát"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>

      <AreYouSureDialog
        title="Opravdu chcete aktualizovat inzerát?"
        description="Tato akce aktualizuje popis vašeho inzerátu. Změny budou okamžitě viditelné pro všechny uchazeče."
        confirmButtonProps={{
          children: "Ano, aktualizovat inzerát",
          variant: "default",
        }}
        cancelButtonProps={{ children: "Zrušit", variant: "destructive" }}
        onConfirm={handleUpdateConfirm}
        open={showUpdateConfirmation}
        setOpen={setShowUpdateConfirmation}
        loading={isSubmitting}
      />

      <AreYouSureDialog
        title="Jste připraveni?"
        description="Tímto zveřejníte svou nabídku a budete moci ihned volat uchazečům."
        confirmButtonProps={{
          children: "ANO, ZVEŘEJNIT INZERÁT",
          variant: "default",
        }}
        cancelButtonProps={{ children: "ZKONTROLOVAT INZERÁT" }}
        onConfirm={handlePublishConfirm}
        open={showPublishConfirmation}
        setOpen={setShowPublishConfirmation}
        loading={isSubmitting}
      />
    </Dialog>
  );
};
