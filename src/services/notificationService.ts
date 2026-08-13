import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  getNativeAppLanguage,
  type NativeAppLanguage,
} from "../localization/nativeLocale";

export const PARKING_REMINDER_CHANNEL_ID = "parking-reminders";
export const PARKING_DEPARTURE_NOTIFICATION_TYPE =
  "parking-departure-reminder";

const PARKING_DEPARTURE_NOTIFICATION_IDENTIFIER_PREFIX =
  "parking-departure-reminder:";

type ParkingNotificationCopy = {
  channelName: string;
  channelDescription: string;
  departureTitle: string;
  departureBody: string;
  zoneLabel: string;
  vehicleLabel: string;
};

const PARKING_NOTIFICATION_COPY: Record<
  NativeAppLanguage,
  ParkingNotificationCopy
> = {
  en: {
    channelName: "Parking reminders",
    channelDescription:
      "Reminders when parking is still active after you appear to leave.",
    departureTitle: "Parking is still active",
    departureBody:
      "You appear to have left your parked location. Stop parking if you are finished.",
    zoneLabel: "Zone",
    vehicleLabel: "Vehicle",
  },
  mk: {
    channelName: "Потсетници за паркирање",
    channelDescription:
      "Потсетници кога паркирањето е сè уште активно откако ќе ја напуштите локацијата.",
    departureTitle: "Паркирањето сè уште е активно",
    departureBody:
      "Изгледа дека ја напуштивте локацијата каде што паркиравте. Запрете го паркирањето ако сте завршиле.",
    zoneLabel: "Зона",
    vehicleLabel: "Возило",
  },
};

export type NotificationPermissionState =
  | "granted"
  | "provisional"
  | "ephemeral"
  | "denied"
  | "undetermined"
  | "unsupported";

export interface ParkingNotificationPermissionStatus {
  state: NotificationPermissionState;
  canDeliver: boolean;
  canShowAlert: boolean;
  canPlaySound: boolean;
  canAskAgain: boolean;
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
  /** A resolved schedule request does not guarantee OS presentation. */
  identifier: string;
  scheduled: true;
}

let notificationHandlerConfigured = false;

function isSupportedNativePlatform(): boolean {
  return Platform.OS === "android" || Platform.OS === "ios";
}

function errorReason(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

/**
 * Installs foreground presentation behavior. Background local notifications are
 * presented by the OS; this handler makes the same reminder visible while the
 * app is open. It must answer synchronously enough for Expo's three-second limit.
 */
export function configureParkingNotificationHandler(): boolean {
  if (!isSupportedNativePlatform() || notificationHandlerConfigured) {
    return notificationHandlerConfigured;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
    }),
  });
  notificationHandlerConfigured = true;
  return true;
}

// Register early whenever this module is evaluated; no React lifecycle is needed.
configureParkingNotificationHandler();

function mapPermissionStatus(
  response: Notifications.NotificationPermissionsStatus,
): ParkingNotificationPermissionStatus {
  if (Platform.OS === "ios") {
    let state: NotificationPermissionState;

    switch (response.ios?.status) {
      case Notifications.IosAuthorizationStatus.AUTHORIZED:
        state = "granted";
        break;
      case Notifications.IosAuthorizationStatus.PROVISIONAL:
        state = "provisional";
        break;
      case Notifications.IosAuthorizationStatus.EPHEMERAL:
        state = "ephemeral";
        break;
      case Notifications.IosAuthorizationStatus.DENIED:
        state = "denied";
        break;
      case Notifications.IosAuthorizationStatus.NOT_DETERMINED:
      default:
        state = "undetermined";
        break;
    }

    const canDeliver =
      state === "granted" ||
      state === "provisional" ||
      state === "ephemeral";

    return {
      state,
      canDeliver,
      canShowAlert: canDeliver && response.ios?.allowsAlert === true,
      canPlaySound: canDeliver && response.ios?.allowsSound === true,
      canAskAgain: response.canAskAgain,
    };
  }

  switch (response.status) {
    case Notifications.PermissionStatus.GRANTED:
      return {
        state: "granted",
        canDeliver: true,
        canShowAlert: true,
        canPlaySound: true,
        canAskAgain: response.canAskAgain,
      };
    case Notifications.PermissionStatus.DENIED:
      return {
        state: "denied",
        canDeliver: false,
        canShowAlert: false,
        canPlaySound: false,
        canAskAgain: response.canAskAgain,
      };
    case Notifications.PermissionStatus.UNDETERMINED:
    default:
      return {
        state: "undetermined",
        canDeliver: false,
        canShowAlert: false,
        canPlaySound: false,
        canAskAgain: response.canAskAgain,
      };
  }
}

async function ensureParkingReminderChannelForLanguage(
  language: NativeAppLanguage,
): Promise<
  NotificationServiceResult<null>
> {
  if (!isSupportedNativePlatform()) {
    return {
      success: false,
      code: "unsupported-platform",
      reason: "Parking notifications require Android or iOS.",
    };
  }

  if (Platform.OS !== "android") {
    return { success: true, value: null };
  }

  try {
    const copy = PARKING_NOTIFICATION_COPY[language];

    await Notifications.setNotificationChannelAsync(
      PARKING_REMINDER_CHANNEL_ID,
      {
        name: copy.channelName,
        description: copy.channelDescription,
        importance: Notifications.AndroidImportance.DEFAULT,
        showBadge: false,
      },
    );
    return { success: true, value: null };
  } catch (error) {
    return {
      success: false,
      code: "channel-error",
      reason: errorReason(
        error,
        "The parking reminder notification channel could not be created.",
      ),
    };
  }
}

/** Creates the Android 8+ channel and is a no-op on iOS. */
export async function ensureParkingReminderChannel(): Promise<
  NotificationServiceResult<null>
> {
  return ensureParkingReminderChannelForLanguage(
    await getNativeAppLanguage(),
  );
}

/** Reads notification permission without displaying a prompt. */
export async function getNotificationPermissionStatus(): Promise<
  NotificationServiceResult<ParkingNotificationPermissionStatus>
> {
  if (!isSupportedNativePlatform()) {
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

  try {
    const response = await Notifications.getPermissionsAsync();
    return { success: true, value: mapPermissionStatus(response) };
  } catch (error) {
    return {
      success: false,
      code: "native-error",
      reason: errorReason(
        error,
        "Notification permission could not be checked.",
      ),
    };
  }
}

/**
 * Explicitly requests only alert and sound access. Android creates its channel
 * first because Android 13 will not show the notification prompt before one
 * exists. This function is never called automatically by scheduling or startup.
 */
export async function requestParkingReminderNotificationPermission(): Promise<
  NotificationServiceResult<ParkingNotificationPermissionStatus>
> {
  if (!isSupportedNativePlatform()) {
    return {
      success: false,
      code: "unsupported-platform",
      reason: "Notification permission is unavailable on this platform.",
    };
  }

  const channelResult = await ensureParkingReminderChannel();

  if (!channelResult.success) {
    return channelResult;
  }

  try {
    const response = await Notifications.requestPermissionsAsync(
      Platform.OS === "ios"
        ? {
            ios: {
              allowAlert: true,
              allowSound: true,
              allowBadge: false,
            },
          }
        : { android: {} },
    );

    return { success: true, value: mapPermissionStatus(response) };
  } catch (error) {
    return {
      success: false,
      code: "native-error",
      reason: errorReason(
        error,
        "Notification permission could not be requested.",
      ),
    };
  }
}

export function getParkingDepartureReminderIdentifier(
  sessionId: string,
): string {
  return `${PARKING_DEPARTURE_NOTIFICATION_IDENTIFIER_PREFIX}${sessionId.trim()}`;
}

function normalizedContext(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

/**
 * Schedules one immediate local reminder with a stable per-session identifier.
 * This re-checks, but never requests, notification permission. The caller still
 * owns session-state validation and persisted once-only deduplication.
 */
export async function scheduleParkingDepartureReminder(
  input: ParkingDepartureReminderInput,
): Promise<NotificationServiceResult<ScheduledParkingDepartureReminder>> {
  const sessionId = input.sessionId.trim();

  if (!sessionId) {
    return {
      success: false,
      code: "invalid-session",
      reason: "A parking session ID is required for the reminder.",
    };
  }

  if (!isSupportedNativePlatform()) {
    return {
      success: false,
      code: "unsupported-platform",
      reason: "Parking notifications require Android or iOS.",
    };
  }

  const language = await getNativeAppLanguage();
  const copy = PARKING_NOTIFICATION_COPY[language];
  const channelResult = await ensureParkingReminderChannelForLanguage(
    language,
  );

  if (!channelResult.success) {
    return channelResult;
  }

  const permissionResult = await getNotificationPermissionStatus();

  if (!permissionResult.success) {
    return permissionResult;
  }

  if (!permissionResult.value.canDeliver) {
    return {
      success: false,
      code: "permission-required",
      reason: "Notification permission is required for parking reminders.",
    };
  }

  const zoneCode = normalizedContext(input.zoneCode);
  const plate = normalizedContext(input.plate);
  const context = [
    zoneCode ? `${copy.zoneLabel}: ${zoneCode}` : null,
    plate ? `${copy.vehicleLabel}: ${plate}` : null,
  ]
    .filter((value): value is string => value !== null)
    .join(" · ");
  const identifier = getParkingDepartureReminderIdentifier(sessionId);

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: copy.departureTitle,
        body: context
          ? `${copy.departureBody}\n${context}`
          : copy.departureBody,
        sound: "default",
        data: {
          type: PARKING_DEPARTURE_NOTIFICATION_TYPE,
          sessionId,
          ...(zoneCode ? { zoneCode } : {}),
          ...(plate ? { plate } : {}),
        },
      },
      trigger:
        Platform.OS === "android"
          ? { channelId: PARKING_REMINDER_CHANNEL_ID }
          : null,
    });

    return {
      success: true,
      value: { identifier, scheduled: true },
    };
  } catch (error) {
    return {
      success: false,
      code: "native-error",
      reason: errorReason(
        error,
        "The parking departure reminder could not be scheduled.",
      ),
    };
  }
}

export const notificationService = {
  configureHandler: configureParkingNotificationHandler,
  ensureChannel: ensureParkingReminderChannel,
  getPermissionStatus: getNotificationPermissionStatus,
  requestPermission: requestParkingReminderNotificationPermission,
  scheduleDepartureReminder: scheduleParkingDepartureReminder,
};
