import * as TaskManager from "expo-task-manager";

import {
  PARKING_DEPARTURE_LOCATION_TASK_NAME,
} from "../services/backgroundLocationService";
import {
  processParkingDepartureLocations,
  type ParkingDepartureNativeLocation,
} from "../services/parkingDepartureProcessor";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isParkingDepartureNativeLocation(
  value: unknown,
): value is ParkingDepartureNativeLocation {
  if (!isRecord(value) || !isRecord(value.coords)) {
    return false;
  }

  return (
    typeof value.timestamp === "number" &&
    typeof value.coords.latitude === "number" &&
    typeof value.coords.longitude === "number" &&
    (value.coords.accuracy === null ||
      typeof value.coords.accuracy === "number")
  );
}

/** Runtime-decodes the untrusted native task payload without throwing. */
export function decodeParkingDepartureTaskLocations(
  data: unknown,
): readonly ParkingDepartureNativeLocation[] | null {
  if (!isRecord(data) || !Array.isArray(data.locations)) {
    return null;
  }

  return data.locations.filter(isParkingDepartureNativeLocation);
}

// Expo requires this definition to run synchronously at JavaScript module scope.
if (!TaskManager.isTaskDefined(PARKING_DEPARTURE_LOCATION_TASK_NAME)) {
  TaskManager.defineTask<unknown>(
    PARKING_DEPARTURE_LOCATION_TASK_NAME,
    async ({ data, error }) => {
      if (error) {
        return;
      }

      try {
        const locations = decodeParkingDepartureTaskLocations(data);

        if (locations === null) {
          return;
        }

        await processParkingDepartureLocations(locations);
      } catch {
        // Native task callbacks must always settle, even for malformed payloads.
      }
    },
  );
}
