import { useState, useMemo, useEffect, useRef } from "react";

const ITEMS_PER_PAGE = 12;

interface UsePaginationOptions<T> {
  items: T[];
  itemsPerPage?: number;
  enableInfiniteScroll?: boolean;
}

export const usePagination = <T,>({
  items,
  itemsPerPage = ITEMS_PER_PAGE,
  enableInfiniteScroll = true,
}: UsePaginationOptions<T>) => {
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const displayedItems = useMemo(() => {
    return items.slice(0, page * itemsPerPage);
  }, [items, page, itemsPerPage]);

  const hasMoreItems = displayedItems.length < items.length;
  const totalPages = Math.ceil(items.length / itemsPerPage);

  const loadMore = () => {
    if (hasMoreItems) {
      setPage((prev) => prev + 1);
    }
  };

  const reset = () => {
    setPage(1);
  };

  // Infinite scroll with intersection observer
  useEffect(() => {
    if (!enableInfiniteScroll || !hasMoreItems || !loadMoreRef.current) {
      return;
    }

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMoreItems) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMoreItems, enableInfiniteScroll]);

  return {
    displayedItems,
    hasMoreItems,
    currentPage: page,
    totalPages,
    loadMore,
    reset,
    loadMoreRef: enableInfiniteScroll ? loadMoreRef : undefined,
  };
};
