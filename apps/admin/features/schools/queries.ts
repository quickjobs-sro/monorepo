export const schoolsQueryKey = ["admin", "schools"] as const;

export function schoolDetailQueryKey(schoolId: string) {
  return ["admin", "schools", schoolId] as const;
}
