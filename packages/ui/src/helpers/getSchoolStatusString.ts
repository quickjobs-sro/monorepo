export const getSchoolStatusString = (status: string) => {
  switch (status) {
    case "in_progress_1":
      return "1. ročník";
    case "in_progress_2":
      return "2. ročník";
    case "in_progress_3":
      return "3. ročník";
    case "in_progress_4":
      return "4. ročník";
    case "in_progress_5":
      return "5. ročník";
    default:
      return "Absolvent";
  }
};
