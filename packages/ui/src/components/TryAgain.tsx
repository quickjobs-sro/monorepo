import { RefreshCcwIcon } from "lucide-react";
import { Button } from "./core/button";

export const TryAgain = ({ refetch }: { refetch: () => void }) => {
  return (
    <Button
      onClick={() => refetch()}
      className="text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20"
    >
      <RefreshCcwIcon className="w-4 h-4" /> Zkusit znovu
    </Button>
  );
};
