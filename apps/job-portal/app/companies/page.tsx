import { CompaniesPageContent } from "./CompaniesPageContent";
import { getCompaniesListCached } from "../../lib/serverApi";

interface CompaniesPageProps {
    searchParams: Promise<{ page?: string }>;
}

function parsePage(params: { page?: string }): number {
    const pageParam = params?.page;
    const parsed = pageParam ? parseInt(pageParam, 10) : 1;
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

export const revalidate = 3600;

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
    const params = await searchParams;
    const initialPage = parsePage(params);
    let initialCompanies;
    try {
        const result = await getCompaniesListCached();
        initialCompanies = result.companies;
    } catch {
        initialCompanies = undefined;
    }
    return <CompaniesPageContent initialPage={initialPage} initialCompanies={initialCompanies} />;
}
