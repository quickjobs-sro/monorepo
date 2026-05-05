import { Button } from "@ui/components/core/button";
import { ScrollArea, ScrollBar } from "@ui/components/core/scroll-area";
import {
  InfiniteScrollEnd,
  InfiniteScrollLoading,
} from "@ui/components/InfiniteScrollIndicators";
import { useMyJobs } from "@ui/hooks/useMyJobs";
import { cn } from "@ui/lib/utils";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Job, JOB_TERM } from "quickjobs-api-wrapper";
import { useMemo } from "react";
import { HistoryJobItem } from "../MyJobs/HistoryJobItem";

interface JobHistoryDialogViewProps {
  jobTerm: JOB_TERM;
  onSelectJob: (job: Job) => void;
  onBackToForm: () => void;
}

export const JobHistoryDialogView = ({
  jobTerm,
  onSelectJob,
  onBackToForm,
}: JobHistoryDialogViewProps) => {
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    fetchNextPage: fetchNextHistoryPage,
    isFetchingNextPage: isFetchingNextHistoryPage,
    hasNextPage: hasNextHistoryPage,
  } = useMyJobs(jobTerm);

  const allJobs = useMemo(() => {
    return historyData?.pages.flatMap((page) => page.jobs) ?? [];
  }, [historyData?.pages]);

  return (
    <div
      className={cn(
        "py-6 flex flex-col h-full",
        !isLoadingHistory && allJobs.length === 0 && "my-auto"
      )}
    >
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToForm}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět na formulář
        </Button>
      </div>

      {isLoadingHistory && allJobs.length === 0 ? ( // Show loader only on initial load
        <div className="flex justify-center items-center flex-1">
          <div className="text-gray-500">Načítá se historie inzerátů...</div>
        </div>
      ) : !isLoadingHistory && allJobs.length === 0 ? (
        <div className="flex justify-center items-center flex-1">
          <div className="text-gray-500">
            Žádné historické inzeráty nenalezeny
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1" style={{ height: "calc(80vh - 120px)" }}>
          <div className="space-y-4 pr-4">
            {allJobs
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .map((historyJob) => (
                <div
                  key={historyJob.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <HistoryJobItem historyJob={historyJob} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectJob(historyJob)}
                      className="flex items-center gap-2 whitespace-nowrap"
                    >
                      Využít text
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

            {hasNextHistoryPage && (
              <div className="flex justify-center py-4">
                <Button
                  onClick={() => fetchNextHistoryPage()}
                  disabled={isFetchingNextHistoryPage}
                  variant="outline"
                >
                  {isFetchingNextHistoryPage ? "Načítání..." : "Načíst další"}
                </Button>
              </div>
            )}

            <InfiniteScrollLoading
              isLoading={isFetchingNextHistoryPage}
              loadingText="Načítají se další inzeráty..."
            />

            <InfiniteScrollEnd
              hasReachedEnd={!isFetchingNextHistoryPage && !hasNextHistoryPage}
              hasItems={allJobs.length > 0}
              endText="Jste na konci seznamu inzerátů"
            />
          </div>
          <ScrollBar className="w-3 bg-gray-200" />
        </ScrollArea>
      )}
    </div>
  );
};
