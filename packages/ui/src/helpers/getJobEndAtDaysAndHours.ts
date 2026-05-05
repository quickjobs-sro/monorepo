import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  isValid,
} from "date-fns";
import { Job } from "quickjobs-api-wrapper";

export const getJobEndAtDaysAndHours = (job: Job) => {
  const endDate = job.offerExpiresAt ? new Date(job.offerExpiresAt) : null;
  const now = new Date();

  if (!endDate || !isValid(endDate)) {
    return "";
  }

  const totalDays = differenceInDays(endDate, now);
  const afterDays = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000);
  const totalHours = differenceInHours(endDate, afterDays);
  const afterHours = new Date(
    afterDays.getTime() + totalHours * 60 * 60 * 1000
  );
  const totalMinutes = differenceInMinutes(endDate, afterHours);

  return formatTimeCz({
    days: totalDays,
    hours: totalHours,
    minutes: totalMinutes,
    seconds: 0,
  });
};

export function formatTimeCz(countDown: {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}) {
  const dayLabel =
    countDown.days === 1
      ? "den"
      : countDown.days >= 2 && countDown.days <= 4
        ? "dny"
        : "dní";
  if (countDown.days > 0) {
    return `${countDown.days} ${dayLabel} ${countDown.hours} hod.`;
  }
  if (countDown.hours > 0) {
    return `${countDown.hours} hod. ${countDown.minutes} min.`;
  }
  if (countDown.minutes > 0) {
    return `${countDown.minutes} min. ${countDown.seconds} s.`;
  }
  return `${countDown.seconds} s.`;
}
