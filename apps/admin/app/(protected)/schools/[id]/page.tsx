import { SchoolDetailPage } from "@/features/schools/SchoolDetailPage";

export default async function SchoolDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SchoolDetailPage schoolId={id} />;
}
