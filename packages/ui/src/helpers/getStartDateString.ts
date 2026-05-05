import { format } from "date-fns";
import { Job } from "quickjobs-api-wrapper";

type StartDateStringProps = Partial<Job>;

export const getStartDateString = ({
  startsAt,
  endsAt,
  doesStartImmediately,
}: StartDateStringProps) => {
  if (doesStartImmediately) {
    if (startsAt) {
      return format(new Date(startsAt), "dd. MM.");
    }
    return "co nejdříve";
  }

  if (!startsAt) {
    return null;
  }

  if (startsAt && endsAt) {
    return (
      format(new Date(startsAt), "dd. MM. / HH:mm-") +
      format(new Date(endsAt), "HH:mm")
    );
  }

  return format(new Date(startsAt), "dd. MM.");
};
