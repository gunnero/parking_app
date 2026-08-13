import { isRunningInExpoGo } from "expo";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import {
  getNativeAppLanguage,
  getSystemNativeAppLanguage,
  type NativeAppLanguage,
} from "../localization/nativeLocale";

export const PARKING_DEPARTURE_LOCATION_TASK_NAME =
  "parking-departure-location-task";

const COMMON_LOCATION_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 50,
  deferredUpdatesDistance: 50,
  deferredUpdatesInterval: 60_000,
};

/**
 * Battery-conscious defaults for a 200 metre departure detector. The detector
 * must still reject inaccurate readings and enforce its own time/read-count
 * thresholds. Expo batches background readings only after both deferred
 * thresholds are satisfied, so callers must process every location timestamp.
 */
type ParkingForegroundServiceCopy = {
  notificationTitle: string;
  notificationBody: string;
};

const PARKING_FOREGROUND_SERVICE_COPY: Record<
  NativeAppLanguage,
  ParkingForegroundServiceCopy
> = {
  en: {
    notificationTitle: "Parking reminder active",
    notificationBody: "Checking whether you leave your parked location.",
  },
  mk: {
    notificationTitle: "Потсетникот за паркирање е активен",
    notificationBody:
      "Проверуваме дали ја напуштате локацијата каде што паркиравте.",
  },
};

function createParkingDepartureLocationOptions(
  language: NativeAppLanguage,
): Location.LocationTaskOptions {
  const foregroundServiceCopy = PARKING_FOREGROUND_SERVICE_COPY[language];

  return Platform.select<Location.LocationTaskOptions>({
    android: {
      ...COMMON_LOCATION_OPTIONS,
      timeInterval: 30_000,
      foregroundService: {
        notificationTitle: foregroundServiceCopy.notificationTitle,
        notificationBody: foregroundServiceCopy.notificationBody,
        killServiceOnDestroy: false,
      },
    },
    ios: {
      ...COMMON_LOCATION_OPTIONS,
      activityType: Location.ActivityType.Other,
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: false,
    },
    default: COMMON_LOCATION_OPTIONS,
  });
}

/**
 * Synchronous export retained for callers that inspect the defaults. Starting
 * Android monitoring resolves persisted language again immediately beforehand.
 */
export const PARKING_DEPARTURE_LOCATION_OPTIONS: Location.LocationTaskOptions =
  createParkingDepartureLocationOptions(getSystemNativeAppLanguage());

export type BackgroundLocationErrorCode =
  | "unsupported-platform"
  | "expo-go-unsupported"
  | "task-manager-unavailable"
  | "location-services-disabled"
  | "background-location-unavailable"
  | "task-not-defined"
  | "foreground-permission-required"
  | "precise-location-required"
  | "background-permission-required"
  | "native-configuration-missing"
  | "native-error";

export type BackgroundLocationResult<T> =
  | { success: true; value: T }
  | {
      success: false;
      code: BackgroundLocationErrorCode;
      reason: string;
    };

export type LocationPermissionValue =
  | "granted"
  | "denied"
  | "undetermined"
  | "not-checked";

export type LocationPrecision = "precise" | "approximate" | "unknown";

export interface BackgroundLocationPermissionStatus {
  foreground: LocationPermissionValue;
  background: LocationPermissionValue;
  precision: LocationPrecision;
  canAskForegroundAgain: boolean;
  canAskBackgroundAgain: boolean;
  canMonitor: boolean;
}

export interface BackgroundLocationCapability {
  supported: true;
}

export type BackgroundLocationMonitoringTransition =
  | "started"
  | "already-started"
  | "stopped"
  | "already-stopped";

let monitoringOperationQueue: Promise<unknown> = Promise.resolve();

function isSupportedNativePlatform(): boolean {
  return Platform.OS === "android" || Platform.OS === "ios";
}

function errorReason(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function permissionValue(
  status: Location.PermissionStatus,
): Exclude<LocationPermissionValue, "not-checked"> {
  switch (status) {
    case Location.PermissionStatus.GRANTED:
      return "granted";
    case Location.PermissionStatus.DENIED:
      return "denied";
    case Location.PermissionStatus.UNDETERMINED:
    default:
      return "undetermined";
  }
}

function locationPrecision(
  response: Location.LocationPermissionResponse,
): LocationPrecision {
  if (Platform.OS === "android") {
    switch (response.android?.accuracy) {
      case "fine":
        return "precise";
      case "coarse":
        return "approximate";
      default:
        return "unknown";
    }
  }

  if (Platform.OS === "ios") {
    switch (response.ios?.accuracy) {
      case "full":
        return "precise";
      case "reduced":
        return "approximate";
      default:
        return "unknown";
    }
  }

  return "unknown";
}

function foregroundOnlyStatus(
  response: Location.LocationPermissionResponse,
): BackgroundLocationPermissionStatus {
  const foreground = permissionValue(response.status);
  const precision = locationPrecision(response);

  return {
    foreground,
    background: "not-checked",
    precision,
    canAskForegroundAgain: response.canAskAgain,
    canAskBackgroundAgain: false,
    canMonitor: false,
  };
}

function withBackgroundStatus(
  foregroundResponse: Location.LocationPermissionResponse,
  backgroundResponse: Location.PermissionResponse,
): BackgroundLocationPermissionStatus {
  const foreground = permissionValue(foregroundResponse.status);
  const background = permissionValue(backgroundResponse.status);
  const precision = locationPrecision(foregroundResponse);

  return {
    foreground,
    background,
    precision,
    canAskForegroundAgain: foregroundResponse.canAskAgain,
    canAskBackgroundAgain: backgroundResponse.canAskAgain,
    canMonitor:
      foreground === "granted" &&
      background === "granted" &&
      precision === "precise",
  };
}

function configurationErrorCode(error: unknown): BackgroundLocationErrorCode {
  const message = errorReason(error, "").toUpperCase();

  return message.includes("ACCESS_BACKGROUND_LOCATION") ||
    message.includes("UIBACKGROUNDMODES") ||
    message.includes("BACKGROUND MODE")
    ? "native-configuration-missing"
    : "native-error";
}

function enqueueMonitoringOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = monitoringOperationQueue.then(operation, operation);
  monitoringOperationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** Performs read-only runtime checks and never prompts for permission. */
export async function getBackgroundLocationCapability(): Promise<
  BackgroundLocationResult<BackgroundLocationCapability>
> {
  if (!isSupportedNativePlatform()) {
    return {
      success: false,
      code: "unsupported-platform",
      reason: "Background parking reminders require Android or iOS.",
    };
  }

  if (isRunningInExpoGo()) {
    return {
      success: false,
      code: "expo-go-unsupported",
      reason:
        "Background location is not supported for this feature in Expo Go. Use a development build.",
    };
  }

  try {
    if (!(await TaskManager.isAvailableAsync())) {
      return {
        success: false,
        code: "task-manager-unavailable",
        reason: "Background tasks are unavailable in this runtime.",
      };
    }

    if (!(await Location.hasServicesEnabledAsync())) {
      return {
        success: false,
        code: "location-services-disabled",
        reason: "Location services are disabled on this device.",
      };
    }

    if (!(await Location.isBackgroundLocationAvailableAsync())) {
      return {
        success: false,
        code: "background-location-unavailable",
        reason: "Background location is unavailable on this device.",
      };
    }

    if (!TaskManager.isTaskDefined(PARKING_DEPARTURE_LOCATION_TASK_NAME)) {
      return {
        success: false,
        code: "task-not-defined",
        reason: "The parking departure background task is not defined.",
      };
    }

    return { success: true, value: { supported: true } };
  } catch (error) {
    return {
      success: false,
      code: configurationErrorCode(error),
      reason: errorReason(
        error,
        "Background location capability could not be checked.",
      ),
    };
  }
}

/** Reads foreground/background permission state without displaying a prompt. */
export async function getBackgroundLocationPermissionStatus(): Promise<
  BackgroundLocationResult<BackgroundLocationPermissionStatus>
> {
  if (!isSupportedNativePlatform()) {
    return {
      success: false,
      code: "unsupported-platform",
      reason: "Background parking reminders require Android or iOS.",
    };
  }

  try {
    const foregroundResponse =
      await Location.getForegroundPermissionsAsync();
    const foregroundStatus = foregroundOnlyStatus(foregroundResponse);

    if (
      foregroundStatus.foreground !== "granted" ||
      foregroundStatus.precision !== "precise"
    ) {
      return { success: true, value: foregroundStatus };
    }

    const backgroundResponse =
      await Location.getBackgroundPermissionsAsync();

    return {
      success: true,
      value: withBackgroundStatus(foregroundResponse, backgroundResponse),
    };
  } catch (error) {
    return {
      success: false,
      code: configurationErrorCode(error),
      reason: errorReason(
        error,
        "Location permissions could not be checked.",
      ),
    };
  }
}

/** Explicitly requests foreground access only; it never requests background. */
export async function requestParkingReminderForegroundPermission(): Promise<
  BackgroundLocationResult<BackgroundLocationPermissionStatus>
> {
  if (!isSupportedNativePlatform()) {
    return {
      success: false,
      code: "unsupported-platform",
      reason: "Location permission is unavailable on this platform.",
    };
  }

  try {
    const response = await Location.requestForegroundPermissionsAsync();
    return { success: true, value: foregroundOnlyStatus(response) };
  } catch (error) {
    return {
      success: false,
      code: configurationErrorCode(error),
      reason: errorReason(
        error,
        "Foreground location permission could not be requested.",
      ),
    };
  }
}

/**
 * Explicitly requests background access only after precise foreground access
 * already exists. On Android 11+ this opens system settings, so the caller must
 * first show the PARK-specific rationale required by the product flow.
 */
export async function requestParkingReminderBackgroundPermission(): Promise<
  BackgroundLocationResult<BackgroundLocationPermissionStatus>
> {
  if (!isSupportedNativePlatform()) {
    return {
      success: false,
      code: "unsupported-platform",
      reason: "Background location permission is unavailable on this platform.",
    };
  }

  try {
    const foregroundResponse =
      await Location.getForegroundPermissionsAsync();
    const foregroundStatus = foregroundOnlyStatus(foregroundResponse);

    if (foregroundStatus.foreground !== "granted") {
      return {
        success: false,
        code: "foreground-permission-required",
        reason:
          "Foreground location permission must be granted before requesting background access.",
      };
    }

    if (foregroundStatus.precision !== "precise") {
      return {
        success: false,
        code: "precise-location-required",
        reason:
          "Precise location is required for conservative parking departure reminders.",
      };
    }

    const backgroundResponse =
      await Location.requestBackgroundPermissionsAsync();

    return {
      success: true,
      value: withBackgroundStatus(foregroundResponse, backgroundResponse),
    };
  } catch (error) {
    return {
      success: false,
      code: configurationErrorCode(error),
      reason: errorReason(
        error,
        "Background location permission could not be requested.",
      ),
    };
  }
}

export async function isParkingDepartureMonitoringActive(): Promise<
  BackgroundLocationResult<boolean>
> {
  if (!isSupportedNativePlatform()) {
    return {
      success: false,
      code: "unsupported-platform",
      reason: "Background parking reminders require Android or iOS.",
    };
  }

  try {
    return {
      success: true,
      value: await Location.hasStartedLocationUpdatesAsync(
        PARKING_DEPARTURE_LOCATION_TASK_NAME,
      ),
    };
  } catch (error) {
    return {
      success: false,
      code: configurationErrorCode(error),
      reason: errorReason(
        error,
        "Background monitoring status could not be checked.",
      ),
    };
  }
}

/** Starts monitoring idempotently and never requests a permission. */
export function startParkingDepartureMonitoring(): Promise<
  BackgroundLocationResult<BackgroundLocationMonitoringTransition>
> {
  return enqueueMonitoringOperation(async () => {
    const capability = await getBackgroundLocationCapability();

    if (!capability.success) {
      return capability;
    }

    const permissions = await getBackgroundLocationPermissionStatus();

    if (!permissions.success) {
      return permissions;
    }

    if (permissions.value.foreground !== "granted") {
      return {
        success: false,
        code: "foreground-permission-required",
        reason: "Foreground location permission is required.",
      };
    }

    if (permissions.value.precision !== "precise") {
      return {
        success: false,
        code: "precise-location-required",
        reason:
          "Precise location is required for conservative parking departure reminders.",
      };
    }

    if (permissions.value.background !== "granted") {
      return {
        success: false,
        code: "background-permission-required",
        reason: "Background location permission is required.",
      };
    }

    try {
      if (
        await Location.hasStartedLocationUpdatesAsync(
          PARKING_DEPARTURE_LOCATION_TASK_NAME,
        )
      ) {
        return { success: true, value: "already-started" };
      }

      const locationOptions =
        Platform.OS === "android"
          ? createParkingDepartureLocationOptions(
              await getNativeAppLanguage(),
            )
          : PARKING_DEPARTURE_LOCATION_OPTIONS;

      await Location.startLocationUpdatesAsync(
        PARKING_DEPARTURE_LOCATION_TASK_NAME,
        locationOptions,
      );

      return { success: true, value: "started" };
    } catch (error) {
      return {
        success: false,
        code: configurationErrorCode(error),
        reason: errorReason(
          error,
          "Background parking monitoring could not be started.",
        ),
      };
    }
  });
}

/** Stops only the parking location task and is safe to call repeatedly. */
export function stopParkingDepartureMonitoring(): Promise<
  BackgroundLocationResult<BackgroundLocationMonitoringTransition>
> {
  return enqueueMonitoringOperation(async () => {
    if (!isSupportedNativePlatform()) {
      return {
        success: false,
        code: "unsupported-platform",
        reason: "Background parking reminders require Android or iOS.",
      };
    }

    try {
      if (
        !(await Location.hasStartedLocationUpdatesAsync(
          PARKING_DEPARTURE_LOCATION_TASK_NAME,
        ))
      ) {
        return { success: true, value: "already-stopped" };
      }

      await Location.stopLocationUpdatesAsync(
        PARKING_DEPARTURE_LOCATION_TASK_NAME,
      );
      return { success: true, value: "stopped" };
    } catch (error) {
      return {
        success: false,
        code: configurationErrorCode(error),
        reason: errorReason(
          error,
          "Background parking monitoring could not be stopped.",
        ),
      };
    }
  });
}

export const backgroundLocationService = {
  getCapability: getBackgroundLocationCapability,
  getPermissionStatus: getBackgroundLocationPermissionStatus,
  requestForegroundPermission: requestParkingReminderForegroundPermission,
  requestBackgroundPermission: requestParkingReminderBackgroundPermission,
  isMonitoringActive: isParkingDepartureMonitoringActive,
  startMonitoring: startParkingDepartureMonitoring,
  stopMonitoring: stopParkingDepartureMonitoring,
};
