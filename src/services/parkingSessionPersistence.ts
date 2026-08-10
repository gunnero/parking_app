import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ParkingSession } from "../types/parkingSession";
import { restoreParkingSession } from "../utils/parkingSessionState";

export const PARKING_SESSION_STORAGE_KEY = "parkingapp-current-session";
export const PARKING_SESSION_STORAGE_VERSION = 1;

type UnknownRecord = Record<string, unknown>;

let hasHydratedRuntimeSnapshot = false;
let hydratedRuntimeSnapshot: ParkingSession | null = null;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Decodes the versioned Zustand persist envelope written by the parking store.
 * Any malformed or unsupported value fails closed to no active session.
 */
export function restorePersistedParkingSessionEnvelope(
  value: unknown,
): ParkingSession | null {
  if (
    !isRecord(value) ||
    value.version !== PARKING_SESSION_STORAGE_VERSION ||
    !isRecord(value.state) ||
    !("session" in value.state)
  ) {
    return null;
  }

  return restoreParkingSession(value.state.session);
}

/**
 * Publishes the store snapshot only after Zustand hydration has completed.
 * A validated null snapshot is intentionally authoritative in the foreground.
 */
export function publishHydratedParkingSessionSnapshot(
  session: ParkingSession | null,
): void {
  hasHydratedRuntimeSnapshot = true;
  hydratedRuntimeSnapshot = restoreParkingSession(session);
}

/** Reads and strictly validates the parking session directly from AsyncStorage. */
export async function readPersistedParkingSessionSnapshot(): Promise<ParkingSession | null> {
  try {
    const serialized = await AsyncStorage.getItem(PARKING_SESSION_STORAGE_KEY);

    if (serialized === null) {
      return null;
    }

    return restorePersistedParkingSessionEnvelope(JSON.parse(serialized));
  } catch {
    return null;
  }
}

/**
 * Returns the hydrated in-memory snapshot when the foreground store is ready.
 * Headless launches and pre-hydration reads fall back to persisted storage.
 */
export async function getAuthoritativeParkingSessionSnapshot(): Promise<ParkingSession | null> {
  return hasHydratedRuntimeSnapshot
    ? hydratedRuntimeSnapshot
    : readPersistedParkingSessionSnapshot();
}
