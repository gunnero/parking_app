import type { LocationCoordinates } from "../types/location";
import type {
  EvaluateParkingDepartureBatchInput,
  EvaluateParkingDepartureReadingInput,
  ParkingDepartureBatchEvaluation,
  ParkingDepartureConfig,
  ParkingDepartureDetectionState,
  ParkingDepartureDispatchEligibility,
  ParkingDepartureDispatchEligibilityInput,
  ParkingDepartureIgnoredReadingReason,
  ParkingDepartureMetadataTransitionError,
  ParkingDepartureMetadataTransitionOptions,
  ParkingDepartureMetadataTransitionResult,
  ParkingDepartureMonitoringEligibility,
  ParkingDepartureMonitoringEligibilityInput,
  ParkingDepartureQualifyingLocation,
  ParkingDepartureReadingEvaluation,
  RestoreParkingDepartureStateOptions,
} from "../types/parkingReminder";
import { haversineDistanceMeters, isValidGeoPoint } from "./geoDistance";

const FIVE_MINUTES_MS = 5 * 60 * 1_000;

export const DEFAULT_PARKING_DEPARTURE_CONFIG: ParkingDepartureConfig =
  Object.freeze({
    minimumDepartureDistanceMeters: 200,
    minimumConsecutiveOutsideReadings: 2,
    minimumDepartureDurationMs: 60_000,
    maximumUsableAccuracyMeters: 100,
    maximumReadingAgeMs: FIVE_MINUTES_MS,
    maximumFutureSkewMs: 30_000,
    maximumQualifyingGapMs: FIVE_MINUTES_MS,
  });

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isAccuracy(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isValidConfig(config: ParkingDepartureConfig): boolean {
  return (
    Number.isFinite(config.minimumDepartureDistanceMeters) &&
    config.minimumDepartureDistanceMeters > 0 &&
    Number.isSafeInteger(config.minimumConsecutiveOutsideReadings) &&
    config.minimumConsecutiveOutsideReadings >= 2 &&
    Number.isFinite(config.minimumDepartureDurationMs) &&
    config.minimumDepartureDurationMs > 0 &&
    Number.isFinite(config.maximumUsableAccuracyMeters) &&
    config.maximumUsableAccuracyMeters > 0 &&
    Number.isFinite(config.maximumReadingAgeMs) &&
    config.maximumReadingAgeMs > 0 &&
    Number.isFinite(config.maximumFutureSkewMs) &&
    config.maximumFutureSkewMs >= 0 &&
    Number.isFinite(config.maximumQualifyingGapMs) &&
    config.maximumQualifyingGapMs > 0
  );
}

export function resolveParkingDepartureConfig(
  overrides?: Partial<ParkingDepartureConfig>,
): ParkingDepartureConfig | null {
  const config: ParkingDepartureConfig = {
    ...DEFAULT_PARKING_DEPARTURE_CONFIG,
    ...overrides,
  };

  return isValidConfig(config) ? Object.freeze(config) : null;
}

function freezeQualifyingLocation(
  location: ParkingDepartureQualifyingLocation,
): ParkingDepartureQualifyingLocation {
  return Object.freeze({ ...location });
}

function freezeDetectionState(
  state: ParkingDepartureDetectionState,
): ParkingDepartureDetectionState {
  return Object.freeze({
    ...state,
    lastQualifyingLocation: state.lastQualifyingLocation
      ? freezeQualifyingLocation(state.lastQualifyingLocation)
      : null,
  });
}

function readQualifyingLocation(
  value: unknown,
  maximumUsableAccuracyMeters: number,
  latestAllowedTimestamp: number,
): ParkingDepartureQualifyingLocation | null {
  if (
    !isRecord(value) ||
    !isValidGeoPoint(value) ||
    !isAccuracy(value.accuracy) ||
    value.accuracy > maximumUsableAccuracyMeters ||
    !isTimestamp(value.timestamp) ||
    value.timestamp > latestAllowedTimestamp
  ) {
    return null;
  }

  return freezeQualifyingLocation({
    latitude: value.latitude,
    longitude: value.longitude,
    accuracy: value.accuracy,
    timestamp: value.timestamp,
  });
}

function isNullableTimestamp(value: unknown): value is number | null {
  return value === null || isTimestamp(value);
}

function hasChronologicalState(
  state: ParkingDepartureDetectionState,
  config: ParkingDepartureConfig,
): boolean {
  const {
    firstOutsideAt,
    consecutiveOutsideReadings,
    lastQualifyingLocation,
    departureDetectedAt,
    reminderDispatchStartedAt,
    reminderDispatchFailedAt,
    reminderSentAt,
  } = state;

  if (
    !Number.isSafeInteger(consecutiveOutsideReadings) ||
    consecutiveOutsideReadings < 0 ||
    (consecutiveOutsideReadings === 0) !== (firstOutsideAt === null)
  ) {
    return false;
  }

  if (
    firstOutsideAt !== null &&
    (lastQualifyingLocation === null ||
      lastQualifyingLocation.timestamp < firstOutsideAt ||
      lastQualifyingLocation.timestamp - firstOutsideAt >
        (consecutiveOutsideReadings - 1) * config.maximumQualifyingGapMs)
  ) {
    return false;
  }

  if (departureDetectedAt !== null) {
    if (
      firstOutsideAt === null ||
      lastQualifyingLocation === null ||
      consecutiveOutsideReadings < config.minimumConsecutiveOutsideReadings ||
      lastQualifyingLocation.timestamp - firstOutsideAt <
        config.minimumDepartureDurationMs ||
      departureDetectedAt < firstOutsideAt ||
      departureDetectedAt > lastQualifyingLocation.timestamp ||
      lastQualifyingLocation.timestamp - departureDetectedAt >
        config.maximumFutureSkewMs
    ) {
      return false;
    }
  } else if (
    firstOutsideAt !== null &&
    lastQualifyingLocation !== null &&
    consecutiveOutsideReadings >= config.minimumConsecutiveOutsideReadings &&
    lastQualifyingLocation.timestamp - firstOutsideAt >=
      config.minimumDepartureDurationMs
  ) {
    return false;
  }

  if (
    reminderDispatchStartedAt !== null &&
    (departureDetectedAt === null ||
      reminderDispatchStartedAt < departureDetectedAt)
  ) {
    return false;
  }

  if (reminderDispatchFailedAt !== null) {
    if (
      reminderDispatchStartedAt === null ||
      reminderDispatchFailedAt < reminderDispatchStartedAt ||
      reminderSentAt !== null
    ) {
      return false;
    }
  }

  if (
    reminderSentAt !== null &&
    (reminderDispatchStartedAt === null ||
      reminderSentAt < reminderDispatchStartedAt ||
      reminderDispatchFailedAt !== null)
  ) {
    return false;
  }

  return true;
}

export function createParkingDepartureState(
  sessionId: string,
): ParkingDepartureDetectionState {
  if (
    typeof sessionId !== "string" ||
    sessionId.trim() !== sessionId ||
    !sessionId
  ) {
    throw new TypeError("A non-empty, normalized session ID is required.");
  }

  return freezeDetectionState({
    sessionId,
    firstOutsideAt: null,
    consecutiveOutsideReadings: 0,
    lastQualifyingLocation: null,
    departureDetectedAt: null,
    reminderDispatchStartedAt: null,
    reminderDispatchFailedAt: null,
    reminderSentAt: null,
  });
}

/**
 * Restores only structurally and chronologically valid detector metadata.
 * Invalid or forged input fails closed with null.
 */
export function restoreParkingDepartureState(
  value: unknown,
  options: RestoreParkingDepartureStateOptions = {},
): ParkingDepartureDetectionState | null {
  const config = resolveParkingDepartureConfig(options.config);
  const now = options.now ?? Date.now();

  if (!config || !isTimestamp(now) || !isRecord(value)) {
    return null;
  }

  const sessionId = value.sessionId;
  const latestAllowedTimestamp = now + config.maximumFutureSkewMs;
  const lastQualifyingLocation =
    value.lastQualifyingLocation === null
      ? null
      : readQualifyingLocation(
          value.lastQualifyingLocation,
          config.maximumUsableAccuracyMeters,
          latestAllowedTimestamp,
        );
  if (
    typeof sessionId !== "string" ||
    !sessionId ||
    sessionId.trim() !== sessionId ||
    !isNullableTimestamp(value.firstOutsideAt) ||
    typeof value.consecutiveOutsideReadings !== "number" ||
    (value.lastQualifyingLocation !== null &&
      lastQualifyingLocation === null) ||
    !isNullableTimestamp(value.departureDetectedAt) ||
    !isNullableTimestamp(value.reminderDispatchStartedAt) ||
    !isNullableTimestamp(value.reminderDispatchFailedAt) ||
    !isNullableTimestamp(value.reminderSentAt)
  ) {
    return null;
  }

  const numericTimestamps = [
    value.firstOutsideAt,
    value.departureDetectedAt,
    value.reminderDispatchStartedAt,
    value.reminderDispatchFailedAt,
    value.reminderSentAt,
  ];

  if (
    numericTimestamps.some(
      (timestamp) => timestamp !== null && timestamp > latestAllowedTimestamp,
    )
  ) {
    return null;
  }

  const state: ParkingDepartureDetectionState = {
    sessionId,
    firstOutsideAt: value.firstOutsideAt,
    consecutiveOutsideReadings: value.consecutiveOutsideReadings,
    lastQualifyingLocation,
    departureDetectedAt: value.departureDetectedAt,
    reminderDispatchStartedAt: value.reminderDispatchStartedAt,
    reminderDispatchFailedAt: value.reminderDispatchFailedAt,
    reminderSentAt: value.reminderSentAt,
  };

  return hasChronologicalState(state, config)
    ? freezeDetectionState(state)
    : null;
}

function ignoredEvaluation(
  state: ParkingDepartureDetectionState,
  reason: ParkingDepartureIgnoredReadingReason,
  rawDistanceMeters: number | null = null,
  conservativeDistanceMeters: number | null = null,
): ParkingDepartureReadingEvaluation {
  return Object.freeze({
    kind: "ignored",
    reason,
    state,
    rawDistanceMeters,
    conservativeDistanceMeters,
    shouldDispatchReminder:
      state.departureDetectedAt !== null &&
      state.reminderDispatchStartedAt === null &&
      state.reminderSentAt === null,
  });
}

function evaluatedReading(
  kind: Exclude<ParkingDepartureReadingEvaluation["kind"], "ignored">,
  state: ParkingDepartureDetectionState,
  rawDistanceMeters: number,
  conservativeDistanceMeters: number,
): ParkingDepartureReadingEvaluation {
  return Object.freeze({
    kind,
    reason: null,
    state,
    rawDistanceMeters,
    conservativeDistanceMeters,
    shouldDispatchReminder:
      state.departureDetectedAt !== null &&
      state.reminderDispatchStartedAt === null &&
      state.reminderSentAt === null,
  });
}

function sameLocationEvent(
  left: ParkingDepartureQualifyingLocation,
  right: ParkingDepartureQualifyingLocation,
): boolean {
  return (
    left.timestamp === right.timestamp &&
    left.latitude === right.latitude &&
    left.longitude === right.longitude &&
    left.accuracy === right.accuracy
  );
}

function cleanStateForInvalidInput(
  state: ParkingDepartureDetectionState,
): ParkingDepartureDetectionState {
  try {
    return createParkingDepartureState(state.sessionId);
  } catch {
    return freezeDetectionState({
      sessionId: "invalid-session",
      firstOutsideAt: null,
      consecutiveOutsideReadings: 0,
      lastQualifyingLocation: null,
      departureDetectedAt: null,
      reminderDispatchStartedAt: null,
      reminderDispatchFailedAt: null,
      reminderSentAt: null,
    });
  }
}

export function evaluateParkingDepartureReading({
  state,
  parkedLocation,
  reading,
  now = Date.now(),
  config: configOverrides,
}: EvaluateParkingDepartureReadingInput): ParkingDepartureReadingEvaluation {
  const config = resolveParkingDepartureConfig(configOverrides);

  if (!config) {
    return ignoredEvaluation(state, "INVALID_CONFIGURATION");
  }

  if (!isTimestamp(now)) {
    return ignoredEvaluation(state, "INVALID_PROCESSING_TIMESTAMP");
  }

  const restoredState = restoreParkingDepartureState(state, { config, now });

  if (!restoredState) {
    return ignoredEvaluation(
      cleanStateForInvalidInput(state),
      "INVALID_DETECTION_STATE",
    );
  }

  if (restoredState.reminderSentAt !== null) {
    return ignoredEvaluation(restoredState, "REMINDER_ALREADY_SENT");
  }

  if (restoredState.reminderDispatchStartedAt !== null) {
    return ignoredEvaluation(restoredState, "DISPATCH_ALREADY_STARTED");
  }

  if (!isValidGeoPoint(parkedLocation)) {
    return ignoredEvaluation(restoredState, "INVALID_PARKED_LOCATION");
  }

  if (!isAccuracy(parkedLocation.accuracy)) {
    return ignoredEvaluation(
      restoredState,
      parkedLocation.accuracy === null
        ? "PARKED_LOCATION_ACCURACY_UNUSABLE"
        : "INVALID_PARKED_LOCATION",
    );
  }

  if (parkedLocation.accuracy > config.maximumUsableAccuracyMeters) {
    return ignoredEvaluation(
      restoredState,
      "PARKED_LOCATION_ACCURACY_UNUSABLE",
    );
  }

  if (!isValidGeoPoint(reading)) {
    return ignoredEvaluation(restoredState, "INVALID_READING_COORDINATES");
  }

  if (!isTimestamp(reading.timestamp)) {
    return ignoredEvaluation(restoredState, "INVALID_READING_TIMESTAMP");
  }

  if (reading.timestamp < now - config.maximumReadingAgeMs) {
    return ignoredEvaluation(restoredState, "STALE_READING");
  }

  if (reading.timestamp > now + config.maximumFutureSkewMs) {
    return ignoredEvaluation(restoredState, "FUTURE_READING");
  }

  if (!isAccuracy(reading.accuracy)) {
    return ignoredEvaluation(
      restoredState,
      reading.accuracy === null
        ? "READING_ACCURACY_UNUSABLE"
        : "INVALID_READING_ACCURACY",
    );
  }

  if (reading.accuracy > config.maximumUsableAccuracyMeters) {
    return ignoredEvaluation(restoredState, "READING_ACCURACY_UNUSABLE");
  }

  const qualifyingReading: ParkingDepartureQualifyingLocation = {
    latitude: reading.latitude,
    longitude: reading.longitude,
    accuracy: reading.accuracy,
    timestamp: reading.timestamp,
  };
  const previousReading = restoredState.lastQualifyingLocation;

  if (previousReading && reading.timestamp <= previousReading.timestamp) {
    return ignoredEvaluation(
      restoredState,
      sameLocationEvent(previousReading, qualifyingReading)
        ? "DUPLICATE_READING"
        : "OUT_OF_ORDER_READING",
    );
  }

  const rawDistanceMeters = haversineDistanceMeters(
    parkedLocation,
    qualifyingReading,
  );
  const conservativeDistanceMeters = Math.max(
    0,
    rawDistanceMeters - parkedLocation.accuracy - qualifyingReading.accuracy,
  );
  const isOutside =
    conservativeDistanceMeters >= config.minimumDepartureDistanceMeters;

  if (!isOutside) {
    const hadPendingDeparture =
      restoredState.firstOutsideAt !== null ||
      restoredState.consecutiveOutsideReadings > 0 ||
      restoredState.departureDetectedAt !== null;
    const insideState = freezeDetectionState({
      ...restoredState,
      firstOutsideAt: null,
      consecutiveOutsideReadings: 0,
      lastQualifyingLocation: qualifyingReading,
      departureDetectedAt: null,
    });

    return evaluatedReading(
      hadPendingDeparture ? "inside_reset" : "inside",
      insideState,
      rawDistanceMeters,
      conservativeDistanceMeters,
    );
  }

  if (restoredState.departureDetectedAt !== null) {
    return evaluatedReading(
      "departure_already_detected",
      restoredState,
      rawDistanceMeters,
      conservativeDistanceMeters,
    );
  }

  const continuesCandidate =
    restoredState.firstOutsideAt !== null &&
    previousReading !== null &&
    qualifyingReading.timestamp - previousReading.timestamp <=
      config.maximumQualifyingGapMs;
  const firstOutsideAt = continuesCandidate
    ? restoredState.firstOutsideAt
    : qualifyingReading.timestamp;
  const consecutiveOutsideReadings = continuesCandidate
    ? Math.min(
        restoredState.consecutiveOutsideReadings + 1,
        Number.MAX_SAFE_INTEGER,
      )
    : 1;
  const departureDetected =
    consecutiveOutsideReadings >= config.minimumConsecutiveOutsideReadings &&
    qualifyingReading.timestamp - firstOutsideAt >=
      config.minimumDepartureDurationMs;
  const outsideState = freezeDetectionState({
    ...restoredState,
    firstOutsideAt,
    consecutiveOutsideReadings,
    lastQualifyingLocation: qualifyingReading,
    departureDetectedAt: departureDetected
      ? Math.min(qualifyingReading.timestamp, now)
      : null,
  });

  return evaluatedReading(
    departureDetected ? "departure_detected" : "outside_candidate",
    outsideState,
    rawDistanceMeters,
    conservativeDistanceMeters,
  );
}

function sortableTimestamp(reading: unknown): number {
  return isRecord(reading) && isTimestamp(reading.timestamp)
    ? reading.timestamp
    : Number.POSITIVE_INFINITY;
}

export function evaluateParkingDepartureBatch({
  state,
  parkedLocation,
  readings,
  now = Date.now(),
  config,
}: EvaluateParkingDepartureBatchInput): ParkingDepartureBatchEvaluation {
  const orderedReadings = readings
    .map((reading, index) => ({ reading, index }))
    .sort((left, right) => {
      const timestampDifference =
        sortableTimestamp(left.reading) - sortableTimestamp(right.reading);
      return Number.isNaN(timestampDifference)
        ? left.index - right.index
        : timestampDifference || left.index - right.index;
    });
  const evaluations: ParkingDepartureReadingEvaluation[] = [];
  let currentState = state;

  for (const { reading } of orderedReadings) {
    const evaluation = evaluateParkingDepartureReading({
      state: currentState,
      parkedLocation,
      reading,
      now,
      config,
    });

    evaluations.push(evaluation);
    currentState = evaluation.state;
  }

  return Object.freeze({
    state: currentState,
    evaluations: Object.freeze(evaluations),
    shouldDispatchReminder:
      currentState.departureDetectedAt !== null &&
      currentState.reminderDispatchStartedAt === null &&
      currentState.reminderSentAt === null,
  });
}

export function getParkingDepartureMonitoringEligibility({
  remindersEnabled,
  session,
  monitoredSessionId,
  config: configOverrides,
}: ParkingDepartureMonitoringEligibilityInput): ParkingDepartureMonitoringEligibility {
  if (!remindersEnabled) {
    return { eligible: false, reason: "REMINDERS_DISABLED" };
  }

  const config = resolveParkingDepartureConfig(configOverrides);

  if (!config) {
    return { eligible: false, reason: "INVALID_CONFIGURATION" };
  }

  if (!session) {
    return { eligible: false, reason: "SESSION_UNAVAILABLE" };
  }

  if (monitoredSessionId != null && monitoredSessionId !== session.id) {
    return { eligible: false, reason: "SESSION_MISMATCH" };
  }

  if (session.status !== "active") {
    return { eligible: false, reason: "SESSION_NOT_ACTIVE" };
  }

  if (!session.startLocation) {
    return { eligible: false, reason: "START_LOCATION_UNAVAILABLE" };
  }

  if (!isValidGeoPoint(session.startLocation)) {
    return { eligible: false, reason: "START_LOCATION_INVALID" };
  }

  if (!isAccuracy(session.startLocation.accuracy)) {
    return {
      eligible: false,
      reason:
        session.startLocation.accuracy === null
          ? "START_LOCATION_ACCURACY_UNUSABLE"
          : "START_LOCATION_INVALID",
    };
  }

  if (session.startLocation.accuracy > config.maximumUsableAccuracyMeters) {
    return {
      eligible: false,
      reason: "START_LOCATION_ACCURACY_UNUSABLE",
    };
  }

  return {
    eligible: true,
    sessionId: session.id,
    startLocation: Object.freeze({
      latitude: session.startLocation.latitude,
      longitude: session.startLocation.longitude,
      accuracy: session.startLocation.accuracy,
    }),
  };
}

export function getParkingDepartureDispatchEligibility({
  remindersEnabled,
  session,
  detectionState,
  now = Date.now(),
  config,
}: ParkingDepartureDispatchEligibilityInput): ParkingDepartureDispatchEligibility {
  if (!remindersEnabled) {
    return { eligible: false, reason: "REMINDERS_DISABLED" };
  }

  if (!session) {
    return { eligible: false, reason: "SESSION_UNAVAILABLE" };
  }

  if (!detectionState) {
    return { eligible: false, reason: "DETECTION_STATE_UNAVAILABLE" };
  }

  const restoredState = restoreParkingDepartureState(detectionState, {
    now,
    config,
  });

  if (!restoredState) {
    return { eligible: false, reason: "DETECTION_STATE_INVALID" };
  }

  if (restoredState.sessionId !== session.id) {
    return { eligible: false, reason: "SESSION_MISMATCH" };
  }

  if (session.status !== "active") {
    return { eligible: false, reason: "SESSION_NOT_ACTIVE" };
  }

  if (restoredState.reminderSentAt !== null) {
    return { eligible: false, reason: "REMINDER_ALREADY_SENT" };
  }

  if (restoredState.reminderDispatchStartedAt !== null) {
    return { eligible: false, reason: "DISPATCH_ALREADY_STARTED" };
  }

  if (restoredState.departureDetectedAt === null) {
    return { eligible: false, reason: "DEPARTURE_NOT_DETECTED" };
  }

  return { eligible: true };
}

function failedMetadataTransition(
  state: ParkingDepartureDetectionState,
  reason: ParkingDepartureMetadataTransitionError,
): ParkingDepartureMetadataTransitionResult {
  return { success: false, state, reason };
}

type ParkingDepartureTransitionPreparation =
  | {
      readonly success: true;
      readonly state: ParkingDepartureDetectionState;
    }
  | {
      readonly success: false;
      readonly result: ParkingDepartureMetadataTransitionResult;
    };

function prepareMetadataTransition(
  state: ParkingDepartureDetectionState,
  at: number,
  options: ParkingDepartureMetadataTransitionOptions,
): ParkingDepartureTransitionPreparation {
  const config = resolveParkingDepartureConfig(options.config);
  const now = options.now ?? Date.now();

  if (!config) {
    return {
      success: false,
      result: failedMetadataTransition(state, "INVALID_CONFIGURATION"),
    };
  }

  if (
    !isTimestamp(now) ||
    !isTimestamp(at) ||
    at > now + config.maximumFutureSkewMs
  ) {
    return {
      success: false,
      result: failedMetadataTransition(state, "INVALID_TIMESTAMP"),
    };
  }

  const restoredState = restoreParkingDepartureState(state, { now, config });

  if (!restoredState) {
    return {
      success: false,
      result: failedMetadataTransition(state, "INVALID_DETECTION_STATE"),
    };
  }

  return { success: true, state: restoredState };
}

export function markParkingDepartureDispatchStarted(
  state: ParkingDepartureDetectionState,
  at: number = Date.now(),
  options: ParkingDepartureMetadataTransitionOptions = {},
): ParkingDepartureMetadataTransitionResult {
  const preparation = prepareMetadataTransition(state, at, options);

  if (!preparation.success) {
    return preparation.result;
  }

  const currentState = preparation.state;

  if (currentState.reminderSentAt !== null) {
    return failedMetadataTransition(currentState, "REMINDER_ALREADY_SENT");
  }

  if (currentState.reminderDispatchStartedAt !== null) {
    return failedMetadataTransition(currentState, "DISPATCH_ALREADY_STARTED");
  }

  if (currentState.departureDetectedAt === null) {
    return failedMetadataTransition(currentState, "DEPARTURE_NOT_DETECTED");
  }

  if (at < currentState.departureDetectedAt) {
    return failedMetadataTransition(currentState, "TIMESTAMP_OUT_OF_ORDER");
  }

  return {
    success: true,
    state: freezeDetectionState({
      ...currentState,
      reminderDispatchStartedAt: at,
    }),
  };
}

export function markParkingDepartureReminderSent(
  state: ParkingDepartureDetectionState,
  at: number = Date.now(),
  options: ParkingDepartureMetadataTransitionOptions = {},
): ParkingDepartureMetadataTransitionResult {
  const preparation = prepareMetadataTransition(state, at, options);

  if (!preparation.success) {
    return preparation.result;
  }

  const currentState = preparation.state;

  if (currentState.reminderSentAt !== null) {
    return failedMetadataTransition(currentState, "REMINDER_ALREADY_SENT");
  }

  if (currentState.reminderDispatchFailedAt !== null) {
    return failedMetadataTransition(currentState, "DISPATCH_ALREADY_FAILED");
  }

  if (currentState.reminderDispatchStartedAt === null) {
    return failedMetadataTransition(currentState, "DISPATCH_NOT_STARTED");
  }

  if (at < currentState.reminderDispatchStartedAt) {
    return failedMetadataTransition(currentState, "TIMESTAMP_OUT_OF_ORDER");
  }

  return {
    success: true,
    state: freezeDetectionState({ ...currentState, reminderSentAt: at }),
  };
}

export function markParkingDepartureReminderFailed(
  state: ParkingDepartureDetectionState,
  at: number = Date.now(),
  options: ParkingDepartureMetadataTransitionOptions = {},
): ParkingDepartureMetadataTransitionResult {
  const preparation = prepareMetadataTransition(state, at, options);

  if (!preparation.success) {
    return preparation.result;
  }

  const currentState = preparation.state;

  if (currentState.reminderSentAt !== null) {
    return failedMetadataTransition(currentState, "REMINDER_ALREADY_SENT");
  }

  if (currentState.reminderDispatchFailedAt !== null) {
    return failedMetadataTransition(currentState, "DISPATCH_ALREADY_FAILED");
  }

  if (currentState.reminderDispatchStartedAt === null) {
    return failedMetadataTransition(currentState, "DISPATCH_NOT_STARTED");
  }

  if (at < currentState.reminderDispatchStartedAt) {
    return failedMetadataTransition(currentState, "TIMESTAMP_OUT_OF_ORDER");
  }

  return {
    success: true,
    state: freezeDetectionState({
      ...currentState,
      reminderDispatchFailedAt: at,
    }),
  };
}
