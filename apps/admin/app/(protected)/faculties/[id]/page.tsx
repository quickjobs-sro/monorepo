import { FacultyDetailPage } from "@/features/faculties/FacultyDetailPage";

export default async function FacultyDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ schoolId?: string; schoolName?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return <FacultyDetailPage facultyId={id} schoolId={query.schoolId} schoolName={query.schoolName} />;
}
