import { format } from "date-fns";
import { BanknoteIcon, CalendarIcon, MapPinIcon } from "lucide-react";
import { Job } from "quickjobs-api-wrapper";

export const HistoryJobItem = ({ historyJob }: { historyJob: Job }) => {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-700 mb-2 line-clamp-6">
        {historyJob.description}
      </p>
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <MapPinIcon className="w-3 h-3" />
          {historyJob.place?.address}
        </span>
        <span className="flex items-center gap-1">
          <BanknoteIcon className="w-3 h-3" />
          {historyJob.salary}{" "}
          {historyJob.salaryTo ? `- ${historyJob.salaryTo}` : ""} Kč/
          {historyJob.salaryType === "hour"
            ? "hod"
            : historyJob.salaryType === "month"
              ? "měsíc"
              : "celkem"}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <CalendarIcon className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-500">
          Vytvořeno {format(new Date(historyJob.createdAt), "dd.MM.yyyy")}
        </span>
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            historyJob.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {historyJob.status === "active" ? "Aktivní" : "Neaktivní"}
        </span>
      </div>
    </div>
  );
};
