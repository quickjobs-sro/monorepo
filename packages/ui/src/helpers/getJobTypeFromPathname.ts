import { useMemo } from "react";

export enum PathJobType {
  OneTime = "oneTime",
  LongTerm = "longTerm",
  FullTime = "fullTime",
}

export const getJobTypeFromPathname = (pathname: string): PathJobType => {
  const pathnameSegments = useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname]
  );

  switch (pathnameSegments[2]) {
    case "one-time":
      return PathJobType.OneTime;
    case "long-time":
      return PathJobType.LongTerm;
    case "full-time":
      return PathJobType.FullTime;
    default:
      throw new Error(`Invalid job type in pathname: "${pathname}"`);
  }
};
