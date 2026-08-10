import * as Location from "expo-location";

import type {
  LocationCoordinates,
  LocationError,
  LocationErrorCode,
} from "../types/location";

const ERROR_MESSAGES: Record<LocationErrorCode, string> = {
  PERMISSION_DENIED:
    "Location permission was denied. Enable it in your device settings and try again.",
  LOCATION_SERVICES_DISABLED:
    "Location services are turned off. Enable GPS and try again.",
  LOCATION_UNAVAILABLE:
    "Your current location is unavailable. Check your GPS signal and try again.",
  UNKNOWN: "We could not read your location. Please try again.",
};

const CURRENT_LOCATION_TIMEOUT_MS = 30_000;

export class LocationServiceError extends Error {
  readonly code: LocationErrorCode;

  constructor(code: LocationErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "LocationServiceError";
    this.code = code;
  }
}

export function toLocationError(error: unknown): LocationError {
  if (error instanceof LocationServiceError) {
    return { code: error.code, message: error.message };
  }

  return { code: "UNKNOWN", message: ERROR_MESSAGES.UNKNOWN };
}

export async function requestForegroundLocationPermission(): Promise<void> {
  let status: Location.PermissionStatus;

  try {
    ({ status } = await Location.requestForegroundPermissionsAsync());
  } catch {
    throw new LocationServiceError("LOCATION_UNAVAILABLE");
  }

  if (status !== Location.PermissionStatus.GRANTED) {
    throw new LocationServiceError("PERMISSION_DENIED");
  }
}

export async function getCurrentLocation(): Promise<LocationCoordinates> {
  let servicesEnabled: boolean;

  try {
    servicesEnabled = await Location.hasServicesEnabledAsync();
  } catch {
    throw new LocationServiceError("LOCATION_UNAVAILABLE");
  }

  if (!servicesEnabled) {
    throw new LocationServiceError("LOCATION_SERVICES_DISABLED");
  }

  try {
    const { coords } = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }),
      CURRENT_LOCATION_TIMEOUT_MS,
    );

    if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
      throw new LocationServiceError("LOCATION_UNAVAILABLE");
    }

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
    };
  } catch (error) {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        throw new LocationServiceError("PERMISSION_DENIED");
      }
    } catch (permissionError) {
      if (permissionError instanceof LocationServiceError) {
        throw permissionError;
      }
    }

    throw error instanceof LocationServiceError
      ? error
      : new LocationServiceError("LOCATION_UNAVAILABLE");
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new LocationServiceError("LOCATION_UNAVAILABLE"));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export const locationService = {
  requestForegroundPermission: requestForegroundLocationPermission,
  getCurrentLocation,
};
