import { MyJobsList } from "./MyJobsList";
import { APPLICATION_STATUS, EXTERNAL_JOB_TYPE } from "@ui/types/application_status";

export const AcceptedJobsList = () => {
    return (
        <MyJobsList
            applicationStatuses={[
                APPLICATION_STATUS.ACCEPTED,
                APPLICATION_STATUS.APPLIED,
                APPLICATION_STATUS.REJECTED,
            ]}
            externalJobType={EXTERNAL_JOB_TYPE.APPLIED}
            externalJobApplicationStatus={APPLICATION_STATUS.APPLIED}
            description="Zde uvidíš nabídky, na které jsi reagoval/a"
            emptyStateDescription="Zde uvidíš nabídky, na které jsi reagoval/a"
            emptyStateSubtext="Zatím jsi nereagoval/a na žádné nabídky"
            showInactive={false}
        />
    );
};

