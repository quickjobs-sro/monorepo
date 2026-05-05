type NotificationSubscription = Record<string, unknown> | null | undefined;

const PHONE_NOTIFICATION_CHANNEL = "phone";

export const getSubscribedJobTypes = (subscribedNotifications: NotificationSubscription): string[] => {
    if (!subscribedNotifications) {
        return [];
    }

    return Object.keys(subscribedNotifications).filter((jobType) =>
        Array.isArray(subscribedNotifications[jobType])
            && subscribedNotifications[jobType].includes(PHONE_NOTIFICATION_CHANNEL)
    );
};
