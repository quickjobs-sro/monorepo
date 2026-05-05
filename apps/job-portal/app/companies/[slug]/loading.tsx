import { Header } from "../../../components/Header";
import { Skeleton } from "@ui/components/core/skeleton";
import dynamic from "next/dynamic";

const Footer = dynamic(
    () => import("../../../components/Footer").then((m) => ({ default: m.Footer })),
    { loading: () => <div className="h-32 animate-pulse bg-gray-100" /> }
);

export default function CompanyDetailLoading() {
    return (
        <>
            <Header />
            <main className="min-h-screen pt-4 sm:pt-24 md:pt-32 lg:pt-36">
                <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                    {/* Back nav placeholder */}
                    <Skeleton className="h-5 w-28 mb-6" />

                    {/* Company card skeleton */}
                    <div className="border-2 border-gray-200 rounded-lg p-4 sm:p-6">
                        {/* Logo + name */}
                        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 mb-6">
                            <Skeleton className="w-60 h-20 sm:w-80 sm:h-16 rounded" />
                            <Skeleton className="h-8 w-48 md:w-64" />
                        </div>
                        {/* Content rows */}
                        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 md:gap-8">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-36" />
                                <Skeleton className="h-3 w-32" />
                                <Skeleton className="h-3 w-28" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-3/4" />
                            </div>
                            <div>
                                <Skeleton className="h-4 w-40" />
                            </div>
                            <div className="flex flex-col gap-2 items-stretch sm:items-end">
                                <Skeleton className="h-11 w-full sm:w-[320px] rounded-full" />
                                <Skeleton className="h-11 w-full sm:w-[320px] rounded-full" />
                            </div>
                        </div>
                    </div>

                    {/* Active jobs section skeleton */}
                    <div className="mt-10">
                        <Skeleton className="h-7 w-56 mb-2" />
                        <Skeleton className="h-4 w-full max-w-lg mb-6" />
                        <Skeleton className="h-5 w-72 mx-auto" />
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
