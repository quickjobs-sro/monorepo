import { CompanyDetailPage } from "@/features/companies/CompanyDetailPage";

export default async function CompanyDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompanyDetailPage companyId={id} />;
}
