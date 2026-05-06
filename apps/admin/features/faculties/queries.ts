export function facultiesQueryKey(schoolId: number | null) {
  return ["admin", "faculties", schoolId] as const;
}

export function facultyDetailQueryKey(facultyId: string) {
  return ["admin", "faculties", facultyId] as const;
}
