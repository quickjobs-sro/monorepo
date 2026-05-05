"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useTokenRestore } from "../../components/TokenRestoreProvider";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { Skeleton } from "@ui/components/core/skeleton";
import { Button } from "@ui/components/core/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouterWithNavigationLoading } from "@ui/hooks/useRouterWithNavigationLoading";
import { CompanyCard } from "../../components/CompanyCard";
import type { Company } from "../../types";
import { reportError } from "../../lib/reportError";
import { fetchCompanies } from "../../lib/migratedQueries";

const ITEMS_PER_PAGE = 10;
const FETCH_TIMEOUT_MS = 25_000;

interface CompaniesPageContentProps {
    initialPage: number;
    initialCompanies?: Company[];
}

export function CompaniesPageContent({ initialPage, initialCompanies }: CompaniesPageContentProps) {
    const router = useRouterWithNavigationLoading();
    const { mounted, tokenRestored } = useTokenRestore();
    const currentPage = initialPage;
    const [allCompanies, setAllCompanies] = useState<Company[]>(initialCompanies ?? []);
    const [isLoading, setIsLoading] = useState(!initialCompanies || initialCompanies.length === 0);
    const [error, setError] = useState<string | null>(null);
    const [companiesFetchEnabled, setCompaniesFetchEnabled] = useState(false);
    const fetchInFlightRef = useRef(false);
    const controllerRef = useRef<AbortController | null>(null);
    const totalCompanies = allCompanies.length;
    const totalPages = Math.max(1, Math.ceil(totalCompanies / ITEMS_PER_PAGE));
    const companies = useMemo(
        () => allCompanies.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
        [allCompanies, currentPage]
    );

    const updateUrl = (page: number) => {
        const path = page <= 1 ? "/companies" : `/companies?page=${page}`;
        router.replace(path, { scroll: false });
    };
    const setPage = (page: number) => updateUrl(page);
    const goToNextPage = () => updateUrl(currentPage + 1);
    const goToPreviousPage = () => updateUrl(currentPage - 1);

    useEffect(() => {
        if (!mounted || !tokenRestored) return;
        if (initialCompanies && initialCompanies.length > 0) return;
        const t = setTimeout(() => setCompaniesFetchEnabled(true), 300);
        return () => clearTimeout(t);
    }, [mounted, tokenRestored, initialCompanies]);

    useEffect(() => {
        if (!companiesFetchEnabled) return;
        const controller = new AbortController();
        controllerRef.current?.abort();
        controllerRef.current = controller;
        const signal = controller.signal;
        let cancelled = false;
        fetchInFlightRef.current = true;
        const loadCompanies = async () => {
            const requestStart = Date.now();
            try {
                setIsLoading(true);
                setError(null);
                const companiesPromise = fetchCompanies({ signal });
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), FETCH_TIMEOUT_MS)
                );
                const abortPromise = new Promise<never>((_, rej) => {
                    signal.addEventListener("abort", () => rej(new DOMException("Aborted", "AbortError")));
                });
                const companiesData = await Promise.race([companiesPromise, timeoutPromise, abortPromise]);
                if (cancelled) return;
                const companiesList = (companiesData?.companies || []) as Company[];
                setAllCompanies(companiesList);
                setError(null);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (cancelled) return;
                reportError(err, { location: "CompaniesPageContent.fetchCompanies", page: currentPage });
                const elapsed = Date.now() - requestStart;
                const isTransientNetwork =
                    (msg === "Network request failed" || msg === "Failed to fetch" || (err instanceof Error && err.name === "AbortError")) &&
                    elapsed < 2000;
                if (isTransientNetwork) {
                    setIsLoading(false);
                    setError("Došlo k dočasnému problému s připojením. Zkuste to prosím znovu.");
                    return;
                }
                setError("Nepodařilo se načíst firmy. Zkus to prosím znovu.");
            } finally {
                if (!cancelled) setIsLoading(false);
                fetchInFlightRef.current = false;
            }
        };
        loadCompanies();
        return () => {
            cancelled = true;
            controllerRef.current?.abort();
            controllerRef.current = null;
            fetchInFlightRef.current = false;
        };
    }, [companiesFetchEnabled, currentPage]);

    useEffect(() => {
        if (companies.length > 0 && !isLoading) {
            requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
        }
    }, [currentPage, companies.length, isLoading]);

    if (isLoading) {
        return (
            <>
                <Header />
                <main className="mx-auto px-4 sm:px-6 md:px-8 lg:px-16 pt-4 sm:pt-24 md:pt-32 lg:pt-36 max-w-7xl">
                    <div className="mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                        <Skeleton className="h-8 w-64 mb-4" />
                        <Skeleton className="h-24 w-full mb-8" />
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="border-2 border-gray-200 rounded-lg p-4 sm:p-6">
                                <Skeleton className="h-16 w-16 mb-4" />
                                <Skeleton className="h-6 w-48 mb-4" />
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-3/4 mb-6" />
                            </div>
                        ))}
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (error) {
        return (
            <>
                <Header />
                <main className="mx-auto px-4 sm:px-6 md:px-8 lg:px-16 pt-4 sm:pt-24 md:pt-32 lg:pt-36 max-w-7xl">
                    <div className="mx-auto p-4 sm:p-6 md:p-8">
                        <div className="text-center py-12">
                            <p className="text-red-500 mb-4">{error}</p>
                            <Button onClick={() => window.location.reload()}>Zkusit znovu</Button>
                        </div>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <main className="mx-auto px-4 sm:px-6 md:px-8 lg:px-16 pt-4 sm:pt-24 md:pt-32 lg:pt-36 max-w-7xl">
                <div className="mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                    <div className="mb-4 sm:mb-6">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                            Firmy, otevřené studentům a absolventům
                        </h1>
                        <div className="space-y-2 text-sm sm:text-base text-gray-700">
                            <p><strong>Vem to do vlastních rukou a ozvi se firmám sám/a!</strong></p>
                            <p>Nabízí: napsání bakalářských/diplomových prací, praxe, stáže, stipendia, brigády, plné úvazky.</p>
                        </div>
                    </div>
                    {companies.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Zatím nejsou k dispozici žádné firmy.</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-6 sm:space-y-8">
                                {companies.map((company) => (
                                    <CompanyCard key={company.id} variant="listing" company={company} />
                                ))}
                            </div>
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
                                    <div className="text-sm text-gray-600">
                                        Zobrazeno {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCompanies)} z {totalCompanies} firem
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1 || isLoading} className="rounded-full border-none px-2.5" aria-label="Předchozí stránka">
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                const pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={currentPage === pageNum ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setPage(pageNum)}
                                                        disabled={isLoading}
                                                        className={`rounded-full h-8 w-8 ${currentPage === pageNum ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                                                        aria-label={`Stránka ${pageNum}`}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages || isLoading} className="rounded-full border-none px-2.5" aria-label="Další stránka">
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
