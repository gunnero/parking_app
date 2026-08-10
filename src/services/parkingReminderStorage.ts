import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ParkingDepartureDetectionState } from "../types/parkingReminder";
import {
  createParkingDepartureState,
  markParkingDepartureDispatchStarted,
  markParkingDepartureReminderFailed,
  markParkingDepartureReminderSent,
  restoreParkingDepartureState,
} from "../utils/parkingDepartureDetector";

export const PARKING_REMINDER_PREFERENCE_STORAGE_KEY =
  "parkingapp-departure-reminder-preference";
export const PARKING_REMINDER_PREFERENCE_STORAGE_VERSION = 1;
export const PARKING_DEPARTURE_STATE_STORAGE_KEY =
  "parkingapp-departure-detector-state";
export const PARKING_DEPARTURE_STATE_STORAGE_VERSION = 1;

type UnknownRecord = Record<string, unknown>;

export type ParkingReminderPreferenceSource =
  | "default"
  | "stored"
  | "runtime"
  | "corrupt"
  | "unavailable";

export interface ParkingReminderPreferenceSnapshot {
  readonly enabled: boolean;
  readonly source: ParkingReminderPreferenceSource;
}

export type ParkingDepartureStateSource =
  | "missing"
  | "stored"
  | "corrupt"
  | "unavailable";

export interface ParkingDepartureStateSnapshot {
  readonly state: ParkingDepartureDetectionState | null;
  readonly source: ParkingDepartureStateSource;
}

export type ParkingDepartureStateMutation<T> = (
  snapshot: ParkingDepartureStateSnapshot,
) => {
  readonly state: ParkingDepartureDetectionState | null;
  readonly result: T;
};

export type ParkingDepartureDispatchClaimResult =
  | {
      readonly claimed: true;
      readonly state: ParkingDepartureDetectionState;
    }
  | {
      readonly claimed: false;
      readonly reason:
        | "STATE_UNAVAILABLE"
        | "SESSION_MISMATCH"
        | "DEPARTURE_NOT_DETECTED"
        | "DISPATCH_ALREADY_STARTED"
        | "REMINDER_ALREADY_SENT"
        | "INVALID_TIMESTAMP";
    };

let storageOperationQueue: Promise<unknown> = Promise.resolve();
let hasHydratedRuntimePreference = false;
let hydratedRuntimePreference = true;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function enqueueStorageOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageOperationQueue.then(operation, operation);
  storageOperationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function parseJson(serialized: string): unknown {
  return JSON.parse(serialized) as unknown;
}

function restorePreferenceEnvelope(
  value: unknown,
): ParkingReminderPreferenceSnapshot | null {
  if (
    !isRecord(value) ||
    value.version !== PARKING_REMINDER_PREFERENCE_STORAGE_VERSION ||
    typeof value.enabled !== "boolean"
  ) {
    return null;
  }

  return { enabled: value.enabled, source: "stored" };
}

function restoreDetectorEnvelope(
  value: unknown,
  now: number,
): ParkingDepartureDetectionState | null {
  if (
    !isRecord(value) ||
    value.version !== PARKING_DEPARTURE_STATE_STORAGE_VERSION ||
    !("state" in value)
  ) {
    return null;
  }

  return restoreParkingDepartureState(value.state, { now });
}

async function readPreferenceRaw(): Promise<ParkingReminderPreferenceSnapshot> {
  try {
    const serialized = await AsyncStorage.getItem(
      PARKING_REMINDER_PREFERENCE_STORAGE_KEY,
    );

    if (serialized === null) {
      return { enabled: true, source: "default" };
    }

    return (
      restorePreferenceEnvelope(parseJson(serialized)) ?? {
        enabled: false,
        source: "corrupt",
      }
    );
  } catch {
    return { enabled: false, source: "unavailable" };
  }
}

async function readDetectorRaw(
  now: number = Date.now(),
): Promise<ParkingDepartureStateSnapshot> {
  try {
    const serialized = await AsyncStorage.getItem(
      PARKING_DEPARTURE_STATE_STORAGE_KEY,
    );

    if (serialized === null) {
      return { state: null, source: "missing" };
    }

    const state = restoreDetectorEnvelope(parseJson(serialized), now);

    return state
      ? { state, source: "stored" }
      : { state: null, source: "corrupt" };
  } catch {
    return { state: null, source: "unavailable" };
  }
}

async function writeDetectorRaw(
  state: ParkingDepartureDetectionState | null,
): Promise<void> {
  if (state === null) {
    await AsyncStorage.removeItem(PARKING_DEPARTURE_STATE_STORAGE_KEY);
    return;
  }

  const restored = restoreParkingDepartureState(state);

  if (!restored) {
    throw new TypeError("Refusing to persist invalid departure detector state.");
  }

  await AsyncStorage.setItem(
    PARKING_DEPARTURE_STATE_STORAGE_KEY,
    JSON.stringify({
      version: PARKING_DEPARTURE_STATE_STORAGE_VERSION,
      state: restored,
    }),
  );
}

/** Missing preference data intentionally defaults to ON; corrupt data fails OFF. */
export function readParkingReminderPreference(): Promise<ParkingReminderPreferenceSnapshot> {
  return enqueueStorageOperation(readPreferenceRaw);
}

/** Publishes the foreground preference for task/controller race checks. */
export function publishHydratedParkingReminderPreference(
  enabled: boolean,
): void {
  hasHydratedRuntimePreference = true;
  hydratedRuntimePreference = enabled;
}

/** Headless launches fall back to the strict persisted preference codec. */
export function getAuthoritativeParkingReminderPreference(): Promise<ParkingReminderPreferenceSnapshot> {
  return hasHydratedRuntimePreference
    ? Promise.resolve({
        enabled: hydratedRuntimePreference,
        source: "runtime",
      })
    : readParkingReminderPreference();
}

export function writeParkingReminderPreference(
  enabled: boolean,
): Promise<void> {
  return enqueueStorageOperation(() =>
    AsyncStorage.setItem(
      PARKING_REMINDER_PREFERENCE_STORAGE_KEY,
      JSON.stringify({
        version: PARKING_REMINDER_PREFERENCE_STORAGE_VERSION,
        enabled,
      }),
    ),
  );
}

export function readParkingDepartureState(
  now: number = Date.now(),
): Promise<ParkingDepartureStateSnapshot> {
  return enqueueStorageOperation(() => readDetectorRaw(now));
}

/**
 * Performs one serialized detector read/modify/write operation. This prevents
 * overlapping task callbacks from both advancing or claiming the same event.
 */
export function mutateParkingDepartureState<T>(
  mutation: ParkingDepartureStateMutation<T>,
  now: number = Date.now(),
): Promise<T> {
  return enqueueStorageOperation(async () => {
    const snapshot = await readDetectorRaw(now);
    const update = mutation(snapshot);

    // A null mutation result must not silently turn corrupt/unknown metadata
    // into a clean slate, which could re-arm a reminder that already fired.
    if (
      update.state === null &&
      (snapshot.source === "corrupt" || snapshot.source === "unavailable")
    ) {
      return update.result;
    }

    await writeDetectorRaw(update.state);
    return update.result;
  });
}

export function ensureParkingDepartureState(
  sessionId: string,
  now: number = Date.now(),
): Promise<ParkingDepartureStateSnapshot> {
  return enqueueStorageOperation(async () => {
    const snapshot = await readDetectorRaw(now);

    if (snapshot.source === "corrupt" || snapshot.source === "unavailable") {
      return snapshot;
    }

    if (snapshot.state?.sessionId === sessionId) {
      return snapshot;
    }

    const state = createParkingDepartureState(sessionId);
    await writeDetectorRaw(state);
    return { state, source: "stored" };
  });
}

export function clearParkingDepartureState(): Promise<void> {
  return enqueueStorageOperation(() => writeDetectorRaw(null));
}

export function claimParkingDepartureDispatch(
  sessionId: string,
  at: number = Date.now(),
): Promise<ParkingDepartureDispatchClaimResult> {
  return enqueueStorageOperation(async () => {
    const snapshot = await readDetectorRaw(at);
    const state = snapshot.state;

    if (!state) {
      return { claimed: false, reason: "STATE_UNAVAILABLE" };
    }

    if (state.sessionId !== sessionId) {
      return { claimed: false, reason: "SESSION_MISMATCH" };
    }

    const transition = markParkingDepartureDispatchStarted(state, at);

    if (!transition.success) {
      const reason =
        transition.reason === "DEPARTURE_NOT_DETECTED"
          ? "DEPARTURE_NOT_DETECTED"
          : transition.reason === "REMINDER_ALREADY_SENT"
            ? "REMINDER_ALREADY_SENT"
            : transition.reason === "INVALID_TIMESTAMP" ||
                transition.reason === "TIMESTAMP_OUT_OF_ORDER"
              ? "INVALID_TIMESTAMP"
              : "DISPATCH_ALREADY_STARTED";
      return { claimed: false, reason };
    }

    await writeDetectorRaw(transition.state);
    return { claimed: true, state: transition.state };
  });
}

async function recordDispatchTerminalState(
  sessionId: string,
  at: number,
  outcome: "sent" | "failed",
): Promise<ParkingDepartureDetectionState | null> {
  return enqueueStorageOperation(async () => {
    const snapshot = await readDetectorRaw(at);
    const state = snapshot.state;

    if (!state || state.sessionId !== sessionId) {
      return null;
    }

    const transition =
      outcome === "sent"
        ? markParkingDepartureReminderSent(state, at)
        : markParkingDepartureReminderFailed(state, at);

    if (!transition.success) {
      return null;
    }

    await writeDetectorRaw(transition.state);
    return transition.state;
  });
}

export function recordParkingDepartureReminderSent(
  sessionId: string,
  at: number = Date.now(),
): Promise<ParkingDepartureDetectionState | null> {
  return recordDispatchTerminalState(sessionId, at, "sent");
}

export function recordParkingDepartureReminderFailed(
  sessionId: string,
  at: number = Date.now(),
): Promise<ParkingDepartureDetectionState | null> {
  return recordDispatchTerminalState(sessionId, at, "failed");
}
