import { Loader2 } from "lucide-react";

interface InfiniteScrollLoadingProps {
  isLoading: boolean;
  loadingText?: string;
}

export const InfiniteScrollLoading = ({
  isLoading,
  loadingText = "Načítají se další položky...",
}: InfiniteScrollLoadingProps) => {
  if (!isLoading) return null;

  return (
    <div className="flex justify-center items-center py-4">
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{loadingText}</span>
      </div>
    </div>
  );
};

interface InfiniteScrollEndProps {
  hasReachedEnd: boolean;
  hasItems: boolean;
  endText?: string;
}

export const InfiniteScrollEnd = ({
  hasReachedEnd,
  hasItems,
  endText = "Jste na konci seznamu",
}: InfiniteScrollEndProps) => {
  if (!hasReachedEnd || !hasItems) return null;

  return (
    <div className="flex justify-center items-center py-4 text-sm text-gray-500">
      <p>{endText}</p>
    </div>
  );
};
