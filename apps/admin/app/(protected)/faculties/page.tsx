import { FacultiesPage } from "@/features/faculties/FacultiesPage";

export default async function FacultiesRoute({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; schoolName?: string }>;
}) {
  const params = await searchParams;
  return <FacultiesPage initialSchoolId={params.schoolId} initialSchoolName={params.schoolName} />;
}
