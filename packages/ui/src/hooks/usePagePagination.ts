import { useState, useMemo } from "react";

interface UsePagePaginationOptions<T> {
    items: T[];
    itemsPerPage?: number;
    initialPage?: number;
}

interface UsePagePaginationReturn<T> {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    displayedItems: T[];
    setPage: (page: number) => void;
    goToNextPage: () => void;
    goToPreviousPage: () => void;
    startIndex: number;
    endIndex: number;
}

export const usePagePagination = <T,>({
    items,
    itemsPerPage = 10,
    initialPage = 1,
}: UsePagePaginationOptions<T>): UsePagePaginationReturn<T> => {
    const [currentPage, setCurrentPage] = useState(initialPage);

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Ensure currentPage is within valid range
    const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));
    
    const startIndex = (validPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    const displayedItems = useMemo(() => {
        return items.slice(startIndex, endIndex);
    }, [items, startIndex, endIndex]);

    const setPage = (page: number) => {
        const newPage = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(newPage);
    };

    const goToNextPage = () => {
        setPage(validPage + 1);
    };

    const goToPreviousPage = () => {
        setPage(validPage - 1);
    };

    return {
        currentPage: validPage,
        totalPages,
        totalItems,
        displayedItems,
        setPage,
        goToNextPage,
        goToPreviousPage,
        startIndex,
        endIndex,
    };
};
