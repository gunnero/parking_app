export const PARKING_REMINDER_CHANNEL_ID = "parking-reminders";
export const PARKING_DEPARTURE_NOTIFICATION_TYPE =
  "parking-departure-reminder";

export type NotificationPermissionState = "unsupported";

export interface ParkingNotificationPermissionStatus {
  state: NotificationPermissionState;
  canDeliver: false;
  canShowAlert: false;
  canPlaySound: false;
  canAskAgain: false;
}

export type NotificationServiceErrorCode =
  | "unsupported-platform"
  | "invalid-session"
  | "permission-required"
  | "channel-error"
  | "native-error";

export type NotificationServiceResult<T> =
  | { success: true; value: T }
  | {
      success: false;
      code: NotificationServiceErrorCode;
      reason: string;
    };

export interface ParkingDepartureReminderInput {
  sessionId: string;
  zoneCode?: string | null;
  plate?: string | null;
}

export interface ScheduledParkingDepartureReminder {
  identifier: string;
  scheduled: true;
}

const UNSUPPORTED_REASON =
  "Parking notifications require the Android or iOS app.";

export function configureParkingNotificationHandler(): boolean {
  return false;
}

export async function ensureParkingReminderChannel(): Promise<
  NotificationServiceResult<null>
> {
  return {
    success: false,
    code: "unsupported-platform",
    reason: UNSUPPORTED_REASON,
  };
}

export async function getNotificationPermissionStatus(): Promise<
  NotificationServiceResult<ParkingNotificationPermissionStatus>
> {
  return {
    success: true,
    value: {
      state: "unsupported",
      canDeliver: false,
      canShowAlert: false,
      canPlaySound: false,
      canAskAgain: false,
    },
  };
}

export async function requestParkingReminderNotificationPermission(): Promise<
  NotificationServiceResult<ParkingNotificationPermissionStatus>
> {
  return {
    success: false,
    code: "unsupported-platform",
    reason: UNSUPPORTED_REASON,
  };
}

export function getParkingDepartureReminderIdentifier(
  sessionId: string,
): string {
  return `parking-departure-reminder:${sessionId.trim()}`;
}

export async function scheduleParkingDepartureReminder(
  _input: ParkingDepartureReminderInput,
): Promise<NotificationServiceResult<ScheduledParkingDepartureReminder>> {
  return {
    success: false,
    code: "unsupported-platform",
    reason: UNSUPPORTED_REASON,
  };
}

export const notificationService = {
  configureHandler: configureParkingNotificationHandler,
  ensureChannel: ensureParkingReminderChannel,
  getPermissionStatus: getNotificationPermissionStatus,
  requestPermission: requestParkingReminderNotificationPermission,
  scheduleDepartureReminder: scheduleParkingDepartureReminder,
} as const;
