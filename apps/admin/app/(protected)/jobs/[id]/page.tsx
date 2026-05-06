import { JobDetailPage } from "@/features/jobs/JobDetailPage";

export default async function JobDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JobDetailPage jobId={id} />;
}
