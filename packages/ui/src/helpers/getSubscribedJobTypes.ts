import {
  NOTIFICATION_CHANNEL,
  NotificationSubscription,
} from "quickjobs-api-wrapper";

export const getSubscribedJobTypes = (
  subscribedNotifications: NotificationSubscription | undefined
) => {
  if (!subscribedNotifications) return [];
  return Object.keys(subscribedNotifications).filter((jobType) =>
    subscribedNotifications[
      jobType as keyof NotificationSubscription
    ]?.includes(NOTIFICATION_CHANNEL.PHONE)
  );
};
