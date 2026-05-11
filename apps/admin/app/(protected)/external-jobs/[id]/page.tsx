import { ExternalJobDetailPage } from "@/features/external-jobs/ExternalJobDetailPage";

export default async function ExternalJobDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExternalJobDetailPage jobId={id} />;
}
