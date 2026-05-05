import { MyJobsList } from "./MyJobsList";
import { APPLICATION_STATUS, EXTERNAL_JOB_TYPE } from "@ui/types/application_status";

export const IgnoredJobsList = () => {
  return (
    <MyJobsList
      applicationStatuses={[APPLICATION_STATUS.IGNORED]}
      externalJobType={EXTERNAL_JOB_TYPE.IGNORED}
      externalJobApplicationStatus={APPLICATION_STATUS.IGNORED}
      description="Zde uvidíš nabídky, které jsi ignoroval/a"
      emptyStateDescription="Zde uvidíš nabídky, které jsi ignoroval/a"
      emptyStateSubtext="Zatím jsi neignoroval/a žádné nabídky"
      showInactive={true}
    />
  );
};

