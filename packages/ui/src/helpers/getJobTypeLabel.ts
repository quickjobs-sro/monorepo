import { PathJobType } from "./getJobTypeFromPathname";

export enum GrammaticalForm {
  Nominative = "nominative",
  Accusative = "accusative",
}
export const getJobTypeLabel = (
  jobType?: PathJobType,
  plural: boolean = false,
  form: GrammaticalForm = GrammaticalForm.Nominative
): string => {
  switch (jobType) {
    case PathJobType.OneTime:
      switch (form) {
        case GrammaticalForm.Accusative:
          return plural ? "jednorázové brigády" : "jednorázovou brigádu";
        case GrammaticalForm.Nominative:
        default:
          return plural ? "Jednorázové brigády" : "Jednorázová brigáda";
      }

    case PathJobType.FullTime:
      // Same in both cases, but included for consistency
      return plural ? "Plné úvazky" : "Plný úvazek";

    case PathJobType.LongTerm:
      switch (form) {
        case GrammaticalForm.Accusative:
          return plural ? "dlouhodobé brigády / stáže" : "dlouhodobou brigádu / stáž";
        case GrammaticalForm.Nominative:
        default:
          return plural ? "Dlouhodobé brigády" : "Dlouhodobá brigáda";
      }

    default:
      return "";
  }
};
