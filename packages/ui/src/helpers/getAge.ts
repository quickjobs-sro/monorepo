import { differenceInYears } from "date-fns";

export const getAge = (birthDate: string) => {
  const birth = new Date(birthDate);
  const today = new Date();

  const age = differenceInYears(today, birth);

  return age;
};
