import { Job } from "quickjobs-api-wrapper";

export const getGenderString = (job: Job) => {
  switch (job.gender) {
    case "female":
      return "Hledám ženu";
    case "male":
      return "Hledám muže";
    default:
      return "Hledám muže i ženu";
  }
};
