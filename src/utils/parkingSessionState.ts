import { BITOLA_PARKING_OPERATOR } from "../data/bitolaParking";
import type { LocationCoordinates } from "../types/location";
import type {
  ParkingSession,
  ParkingSessionBase,
  ParkingSessionOwnership,
  ParkingSessionRequestResult,
  ParkingSessionStatus,
} from "../types/parkingSession";
import type { ParkingMoney } from "../types/parkingTariff";
import {
  buildStartParkingMessage,
  buildStopParkingMessage,
} from "./parkingSms";
import { validatePlateInput } from "./plate";
import { validateZoneCodeInput } from "./zoneCode";

const PARKING_SESSION_STATUSES = new Set<ParkingSessionStatus>([
  "preparing",
  "awaiting_confirmation",
  "active",
  "stopping",
  "awaiting_stop_confirmation",
  "completed",
  "failed",
]);

const PARKING_SESSION_REQUEST_RESULTS = new Set<ParkingSessionRequestResult>([
  "simulated",
  "sent",
  "unknown",
]);

const SMS_RECIPIENT_PATTERN = /^\+?[0-9]+$/;
const SMS_CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F\u2028\u2029]/;
const INVALID_VALUE = Symbol("invalid-value");

type InvalidValue = typeof INVALID_VALUE;
type UnknownRecord = Record<string, unknown>;
type ClockValue = Date | string | number;

export type ParkingSessionEvent =
  | {
      type: "START_REQUEST_PREPARED";
      at: string;
      result: ParkingSessionRequestResult;
    }
  | { type: "CONFIRM_START"; at: string }
  | { type: "BEGIN_STOP" }
  | {
      type: "STOP_REQUEST_PREPARED";
      at: string;
      result: ParkingSessionRequestResult;
    }
  | { type: "RETURN_TO_ACTIVE" }
  | { type: "CONFIRM_STOP"; at: string }
  | { type: "CANCEL_PENDING" };

export type ParkingSessionTransitionErrorCode =
  | "INVALID_SESSION"
  | "INVALID_TRANSITION"
  | "INVALID_TIMESTAMP"
  | "INVALID_REQUEST_RESULT";

export type ParkingSessionTransitionResult =
  | { success: true; session: ParkingSession | null }
  | {
      success: false;
      code: ParkingSessionTransitionErrorCode;
      error: string;
    };

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | InvalidValue {
  if (typeof value !== "string") {
    return INVALID_VALUE;
  }

  const normalized = value.trim();
  return normalized ? normalized : INVALID_VALUE;
}

function readOptionalNonEmptyString(
  value: unknown,
): string | undefined | InvalidValue {
  if (value === undefined) {
    return undefined;
  }

  return readNonEmptyString(value);
}

function readNullableTimestamp(
  value: unknown,
): string | null | InvalidValue {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return INVALID_VALUE;
  }

  const milliseconds = Date.parse(value);

  if (!Number.isFinite(milliseconds)) {
    return INVALID_VALUE;
  }

  return new Date(milliseconds).toISOString();
}

function readRequestResult(
  value: unknown,
): ParkingSessionRequestResult | null | InvalidValue {
  if (value === null) {
    return null;
  }

  return typeof value === "string" &&
    PARKING_SESSION_REQUEST_RESULTS.has(value as ParkingSessionRequestResult)
    ? (value as ParkingSessionRequestResult)
    : INVALID_VALUE;
}

function readLocation(
  value: unknown,
): LocationCoordinates | null | InvalidValue {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    return INVALID_VALUE;
  }

  const { latitude, longitude, accuracy } = value;

  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !(
      accuracy === null ||
      (typeof accuracy === "number" &&
        Number.isFinite(accuracy) &&
        accuracy >= 0)
    )
  ) {
    return INVALID_VALUE;
  }

  return { latitude, longitude, accuracy };
}

function readMoney(value: unknown): ParkingMoney | null | InvalidValue {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    return INVALID_VALUE;
  }

  const currency = readNonEmptyString(value.currency);

  if (
    currency === INVALID_VALUE ||
    typeof value.amount !== "number" ||
    !Number.isFinite(value.amount) ||
    value.amount < 0
  ) {
    return INVALID_VALUE;
  }

  return { amount: value.amount, currency };
}

function readOwnership(
  value: unknown,
): ParkingSessionOwnership | undefined | InvalidValue {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    return INVALID_VALUE;
  }

  const ownership: {
    driverUserId?: string;
    requesterUserId?: string;
    payerUserId?: string;
    smsSenderUserId?: string;
  } = {};
  const keys = [
    "driverUserId",
    "requesterUserId",
    "payerUserId",
    "smsSenderUserId",
  ] as const;

  for (const key of keys) {
    if (!(key in value)) {
      continue;
    }

    const userId = readNonEmptyString(value[key]);

    if (userId === INVALID_VALUE) {
      return INVALID_VALUE;
    }

    ownership[key] = userId;
  }

  return ownership;
}

function isRequestPairValid(
  preparedAt: string | null,
  result: ParkingSessionRequestResult | null,
): boolean {
  return (preparedAt === null) === (result === null);
}

function isRequestResultValidForDelivery(
  deliveryMode: ParkingSession["deliveryMode"],
  result: ParkingSessionRequestResult | null,
): boolean {
  if (result === null) {
    return true;
  }

  return deliveryMode === "simulation"
    ? result === "simulated"
    : result === "sent" || result === "unknown";
}

function isAtOrAfter(timestamp: string, earlierTimestamp: string): boolean {
  return Date.parse(timestamp) >= Date.parse(earlierTimestamp);
}

function hasValidStatusInvariants(session: ParkingSession): boolean {
  const hasStartRequest = session.startRequestPreparedAt !== null;
  const hasStarted = session.startedAt !== null;
  const hasStopRequest = session.stopRequestPreparedAt !== null;
  const hasStopped = session.stoppedAt !== null;

  if (
    !isRequestPairValid(
      session.startRequestPreparedAt,
      session.startRequestResult,
    ) ||
    !isRequestPairValid(
      session.stopRequestPreparedAt,
      session.stopRequestResult,
    ) ||
    !isRequestResultValidForDelivery(
      session.deliveryMode,
      session.startRequestResult,
    ) ||
    !isRequestResultValidForDelivery(
      session.deliveryMode,
      session.stopRequestResult,
    )
  ) {
    return false;
  }

  switch (session.status) {
    case "preparing":
      return !hasStartRequest && !hasStarted && !hasStopRequest && !hasStopped;
    case "awaiting_confirmation":
      return hasStartRequest && !hasStarted && !hasStopRequest && !hasStopped;
    case "active":
    case "stopping":
      return hasStartRequest && hasStarted && !hasStopRequest && !hasStopped;
    case "awaiting_stop_confirmation":
      return hasStartRequest && hasStarted && hasStopRequest && !hasStopped;
    case "completed":
      return hasStartRequest && hasStarted && hasStopRequest && hasStopped;
    case "failed":
      return !hasStarted && !hasStopRequest && !hasStopped;
  }
}

function hasChronologicalTimestamps(session: ParkingSession): boolean {
  if (
    session.startRequestPreparedAt !== null &&
    session.startedAt !== null &&
    !isAtOrAfter(session.startedAt, session.startRequestPreparedAt)
  ) {
    return false;
  }

  if (
    session.startedAt !== null &&
    session.stopRequestPreparedAt !== null &&
    !isAtOrAfter(session.stopRequestPreparedAt, session.startedAt)
  ) {
    return false;
  }

  if (
    session.stopRequestPreparedAt !== null &&
    session.stoppedAt !== null &&
    !isAtOrAfter(session.stoppedAt, session.stopRequestPreparedAt)
  ) {
    return false;
  }

  return true;
}

function freezeSession(session: ParkingSession): ParkingSession {
  const immutableSession = {
    ...session,
    ...(session.ownership
      ? { ownership: Object.freeze({ ...session.ownership }) }
      : {}),
    startLocation: session.startLocation
      ? Object.freeze({ ...session.startLocation })
      : null,
    lastKnownLocation: session.lastKnownLocation
      ? Object.freeze({ ...session.lastKnownLocation })
      : null,
    estimatedCost: session.estimatedCost
      ? Object.freeze({ ...session.estimatedCost })
      : null,
    finalCost: session.finalCost
      ? Object.freeze({ ...session.finalCost })
      : null,
  } as ParkingSession;

  return Object.freeze(immutableSession);
}

/**
 * Validates and sanitizes unknown persisted data. Invalid or internally
 * inconsistent snapshots are discarded instead of being exposed to the UI.
 */
export function restoreParkingSession(value: unknown): ParkingSession | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readNonEmptyString(value.id);
  const operatorId = readNonEmptyString(value.operatorId);
  const zoneId = readNonEmptyString(value.zoneId);
  const zoneCode = readNonEmptyString(value.zoneCode);
  const zoneName = readOptionalNonEmptyString(value.zoneName);
  const vehicleId = readNonEmptyString(value.vehicleId);
  const plate = readNonEmptyString(value.plate);
  const vehicleNickname = readOptionalNonEmptyString(value.vehicleNickname);
  const startMessage = readNonEmptyString(value.startMessage);
  const stopMessage = readNonEmptyString(value.stopMessage);
  const ownership = readOwnership(value.ownership);
  const startRequestPreparedAt = readNullableTimestamp(
    value.startRequestPreparedAt,
  );
  const startRequestResult = readRequestResult(value.startRequestResult);
  const startedAt = readNullableTimestamp(value.startedAt);
  const stopRequestPreparedAt = readNullableTimestamp(
    value.stopRequestPreparedAt,
  );
  const stopRequestResult = readRequestResult(value.stopRequestResult);
  const stoppedAt = readNullableTimestamp(value.stoppedAt);
  const startLocation = readLocation(value.startLocation);
  const lastKnownLocation = readLocation(value.lastKnownLocation);
  const estimatedCost = readMoney(value.estimatedCost);
  const finalCost = readMoney(value.finalCost);

  if (
    id === INVALID_VALUE ||
    operatorId === INVALID_VALUE ||
    zoneId === INVALID_VALUE ||
    zoneCode === INVALID_VALUE ||
    zoneName === INVALID_VALUE ||
    vehicleId === INVALID_VALUE ||
    plate === INVALID_VALUE ||
    vehicleNickname === INVALID_VALUE ||
    startMessage === INVALID_VALUE ||
    stopMessage === INVALID_VALUE ||
    ownership === INVALID_VALUE ||
    startRequestPreparedAt === INVALID_VALUE ||
    startRequestResult === INVALID_VALUE ||
    startedAt === INVALID_VALUE ||
    stopRequestPreparedAt === INVALID_VALUE ||
    stopRequestResult === INVALID_VALUE ||
    stoppedAt === INVALID_VALUE ||
    startLocation === INVALID_VALUE ||
    lastKnownLocation === INVALID_VALUE ||
    estimatedCost === INVALID_VALUE ||
    finalCost === INVALID_VALUE ||
    typeof value.status !== "string" ||
    !PARKING_SESSION_STATUSES.has(value.status as ParkingSessionStatus) ||
    (value.deliveryMode !== "simulation" && value.deliveryMode !== "sms")
  ) {
    return null;
  }

  if (
    SMS_CONTROL_CHARACTER_PATTERN.test(startMessage) ||
    SMS_CONTROL_CHARACTER_PATTERN.test(stopMessage)
  ) {
    return null;
  }

  const zoneValidation = validateZoneCodeInput(zoneCode);
  const plateValidation = validatePlateInput(plate);

  if (
    !zoneValidation.isValid ||
    zoneValidation.normalizedZoneCode !== zoneCode ||
    !plateValidation.isValid ||
    plateValidation.normalizedPlate !== plate
  ) {
    return null;
  }

  const base: ParkingSessionBase = {
    id,
    operatorId,
    zoneId,
    zoneCode,
    ...(zoneName ? { zoneName } : {}),
    vehicleId,
    plate,
    ...(vehicleNickname ? { vehicleNickname } : {}),
    ...(ownership ? { ownership } : {}),
    startRequestPreparedAt,
    startRequestResult,
    startedAt,
    stopRequestPreparedAt,
    stopRequestResult,
    stoppedAt,
    status: value.status as ParkingSessionStatus,
    startLocation,
    lastKnownLocation,
    startMessage,
    stopMessage,
    estimatedCost,
    finalCost,
  };

  let session: ParkingSession;

  if (value.deliveryMode === "simulation") {
    if (value.smsNumber !== null) {
      return null;
    }

    session = { ...base, deliveryMode: "simulation", smsNumber: null };
  } else {
    const smsNumber = readNonEmptyString(value.smsNumber);

    if (
      smsNumber === INVALID_VALUE ||
      !SMS_RECIPIENT_PATTERN.test(smsNumber)
    ) {
      return null;
    }

    let expectedStartMessage: string;
    let expectedStopMessage: string;

    try {
      expectedStartMessage = buildStartParkingMessage(zoneCode, plate);
      expectedStopMessage = buildStopParkingMessage();
    } catch {
      return null;
    }

    if (
      operatorId !== BITOLA_PARKING_OPERATOR.id ||
      smsNumber !== BITOLA_PARKING_OPERATOR.sms.number ||
      startMessage !== expectedStartMessage ||
      stopMessage !== expectedStopMessage
    ) {
      return null;
    }

    session = { ...base, deliveryMode: "sms", smsNumber };
  }

  return hasValidStatusInvariants(session) && hasChronologicalTimestamps(session)
    ? freezeSession(session)
    : null;
}

export function isTerminalParkingSessionStatus(
  status: ParkingSessionStatus,
): boolean {
  return status === "completed" || status === "failed";
}

export function canResetParkingSession(session: ParkingSession | null): boolean {
  return session !== null && isTerminalParkingSessionStatus(session.status);
}

function transitionFailure(
  code: ParkingSessionTransitionErrorCode,
  error: string,
): ParkingSessionTransitionResult {
  return { success: false, code, error };
}

function transitionSuccess(value: unknown): ParkingSessionTransitionResult {
  const session = restoreParkingSession(value);

  return session
    ? { success: true, session }
    : transitionFailure(
        "INVALID_SESSION",
        "The parking session update produced an invalid snapshot.",
      );
}

function eventTimestamp(value: string): string | null {
  const timestamp = readNullableTimestamp(value);
  return timestamp === INVALID_VALUE || timestamp === null ? null : timestamp;
}

/** Applies one explicit lifecycle event without mutating the input session. */
export function transitionParkingSession(
  value: ParkingSession,
  event: ParkingSessionEvent,
): ParkingSessionTransitionResult {
  const session = restoreParkingSession(value);

  if (!session) {
    return transitionFailure(
      "INVALID_SESSION",
      "The current parking session is invalid and cannot be changed.",
    );
  }

  switch (event.type) {
    case "START_REQUEST_PREPARED": {
      if (session.status !== "preparing") {
        return transitionFailure(
          "INVALID_TRANSITION",
          "A start request can only be prepared for a preparing session.",
        );
      }

      if (!isRequestResultValidForDelivery(session.deliveryMode, event.result)) {
        return transitionFailure(
          "INVALID_REQUEST_RESULT",
          "The start request result does not match this session's delivery mode.",
        );
      }

      const at = eventTimestamp(event.at);

      if (!at) {
        return transitionFailure(
          "INVALID_TIMESTAMP",
          "The start request timestamp is invalid.",
        );
      }

      return transitionSuccess({
        ...session,
        status: "awaiting_confirmation",
        startRequestPreparedAt: at,
        startRequestResult: event.result,
      });
    }

    case "CONFIRM_START": {
      if (
        session.status !== "awaiting_confirmation" ||
        session.startRequestPreparedAt === null
      ) {
        return transitionFailure(
          "INVALID_TRANSITION",
          "Only a session awaiting start confirmation can become active.",
        );
      }

      const at = eventTimestamp(event.at);

      if (!at || !isAtOrAfter(at, session.startRequestPreparedAt)) {
        return transitionFailure(
          "INVALID_TIMESTAMP",
          "The start confirmation timestamp is invalid.",
        );
      }

      return transitionSuccess({
        ...session,
        status: "active",
        startedAt: at,
      });
    }

    case "BEGIN_STOP":
      return session.status === "active"
        ? transitionSuccess({ ...session, status: "stopping" })
        : transitionFailure(
            "INVALID_TRANSITION",
            "Only an active parking session can begin stopping.",
          );

    case "STOP_REQUEST_PREPARED": {
      if (session.status !== "stopping" || session.startedAt === null) {
        return transitionFailure(
          "INVALID_TRANSITION",
          "A stop request can only be prepared for a stopping session.",
        );
      }

      if (!isRequestResultValidForDelivery(session.deliveryMode, event.result)) {
        return transitionFailure(
          "INVALID_REQUEST_RESULT",
          "The stop request result does not match this session's delivery mode.",
        );
      }

      const at = eventTimestamp(event.at);

      if (!at || !isAtOrAfter(at, session.startedAt)) {
        return transitionFailure(
          "INVALID_TIMESTAMP",
          "The stop request timestamp is invalid.",
        );
      }

      return transitionSuccess({
        ...session,
        status: "awaiting_stop_confirmation",
        stopRequestPreparedAt: at,
        stopRequestResult: event.result,
      });
    }

    case "RETURN_TO_ACTIVE":
      return session.status === "stopping" ||
        session.status === "awaiting_stop_confirmation"
        ? transitionSuccess({
            ...session,
            status: "active",
            stopRequestPreparedAt: null,
            stopRequestResult: null,
          })
        : transitionFailure(
            "INVALID_TRANSITION",
            "Only a pending stop request can return to the active session.",
          );

    case "CONFIRM_STOP": {
      if (
        session.status !== "awaiting_stop_confirmation" ||
        session.stopRequestPreparedAt === null
      ) {
        return transitionFailure(
          "INVALID_TRANSITION",
          "Only a session awaiting stop confirmation can be completed.",
        );
      }

      const at = eventTimestamp(event.at);

      if (!at || !isAtOrAfter(at, session.stopRequestPreparedAt)) {
        return transitionFailure(
          "INVALID_TIMESTAMP",
          "The stop confirmation timestamp is invalid.",
        );
      }

      return transitionSuccess({
        ...session,
        status: "completed",
        stoppedAt: at,
      });
    }

    case "CANCEL_PENDING":
      return session.status === "preparing" ||
        session.status === "awaiting_confirmation"
        ? { success: true, session: null }
        : transitionFailure(
            "INVALID_TRANSITION",
            "Only a pending start request can be cancelled.",
          );
  }
}

function clockMilliseconds(value: ClockValue): number | null {
  const milliseconds =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : Date.parse(value);

  return Number.isFinite(milliseconds) ? milliseconds : null;
}

/** Uses lifecycle timestamps, never an incremented counter, as source of truth. */
export function getParkingSessionElapsedMilliseconds(
  session: Pick<ParkingSession, "status" | "startedAt" | "stoppedAt">,
  now: ClockValue = Date.now(),
): number {
  if (session.startedAt === null) {
    return 0;
  }

  const startedAt = clockMilliseconds(session.startedAt);
  const endValue =
    session.status === "completed"
      ? session.stoppedAt
      : now;

  if (endValue === null) {
    return 0;
  }

  const endedAt = clockMilliseconds(endValue);

  if (startedAt === null || endedAt === null || endedAt <= startedAt) {
    return 0;
  }

  return endedAt - startedAt;
}

/** Formats elapsed time as HH:MM:SS without wrapping hours at 24. */
export function formatParkingSessionElapsed(
  elapsedMilliseconds: number,
): string {
  const safeMilliseconds =
    Number.isFinite(elapsedMilliseconds) && elapsedMilliseconds > 0
      ? elapsedMilliseconds
      : 0;
  const totalSeconds = Math.floor(safeMilliseconds / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

export function getParkingSessionElapsedDisplay(
  session: Pick<ParkingSession, "status" | "startedAt" | "stoppedAt">,
  now: ClockValue = Date.now(),
): string {
  return formatParkingSessionElapsed(
    getParkingSessionElapsedMilliseconds(session, now),
  );
}
