import type { LocationCoordinates } from "./location";
import type { ParkingSessionStatus } from "./parkingSession";

/** A timestamped reading supplied by foreground or background location APIs. */
export interface ParkingDepartureLocationSample extends LocationCoordinates {
  readonly timestamp: number;
}

/** A reading that passed coordinate, timestamp, and accuracy validation. */
export interface ParkingDepartureQualifyingLocation
  extends ParkingDepartureLocationSample {
  readonly accuracy: number;
}

export interface ParkingDepartureConfig {
  readonly minimumDepartureDistanceMeters: number;
  readonly minimumConsecutiveOutsideReadings: number;
  readonly minimumDepartureDurationMs: number;
  readonly maximumUsableAccuracyMeters: number;
  readonly maximumReadingAgeMs: number;
  readonly maximumFutureSkewMs: number;
  readonly maximumQualifyingGapMs: number;
}

/**
 * Minimal, session-scoped detector metadata. This is not parking-session
 * authority and intentionally contains no route or location-history array.
 */
export interface ParkingDepartureDetectionState {
  readonly sessionId: string;
  readonly firstOutsideAt: number | null;
  readonly consecutiveOutsideReadings: number;
  readonly lastQualifyingLocation: ParkingDepartureQualifyingLocation | null;
  readonly departureDetectedAt: number | null;
  /** Persisted before invoking the notification API to prevent duplicate sends. */
  readonly reminderDispatchStartedAt: number | null;
  /** Durable failed-at metadata; a failed claim is not retried automatically. */
  readonly reminderDispatchFailedAt: number | null;
  /** Persisted only after the notification API reports success. */
  readonly reminderSentAt: number | null;
}

export interface ParkingDepartureSessionSnapshot {
  readonly id: string;
  readonly status: ParkingSessionStatus;
  readonly startLocation: LocationCoordinates | null;
}

export interface ParkingDepartureMonitoringEligibilityInput {
  readonly remindersEnabled: boolean;
  readonly session: ParkingDepartureSessionSnapshot | null;
  /** When present, reconciliation must not silently reuse another session's state. */
  readonly monitoredSessionId?: string | null;
  readonly config?: Partial<ParkingDepartureConfig>;
}

export type ParkingDepartureMonitoringIneligibilityReason =
  | "REMINDERS_DISABLED"
  | "SESSION_UNAVAILABLE"
  | "SESSION_NOT_ACTIVE"
  | "SESSION_MISMATCH"
  | "START_LOCATION_UNAVAILABLE"
  | "START_LOCATION_INVALID"
  | "START_LOCATION_ACCURACY_UNUSABLE"
  | "INVALID_CONFIGURATION";

export type ParkingDepartureMonitoringEligibility =
  | {
      readonly eligible: true;
      readonly sessionId: string;
      readonly startLocation: Readonly<LocationCoordinates> & {
        readonly accuracy: number;
      };
    }
  | {
      readonly eligible: false;
      readonly reason: ParkingDepartureMonitoringIneligibilityReason;
    };

export interface ParkingDepartureDispatchEligibilityInput {
  readonly remindersEnabled: boolean;
  readonly session: Pick<
    ParkingDepartureSessionSnapshot,
    "id" | "status"
  > | null;
  readonly detectionState: ParkingDepartureDetectionState | null;
  readonly now?: number;
  readonly config?: Partial<ParkingDepartureConfig>;
}

export type ParkingDepartureDispatchIneligibilityReason =
  | "REMINDERS_DISABLED"
  | "SESSION_UNAVAILABLE"
  | "SESSION_NOT_ACTIVE"
  | "DETECTION_STATE_UNAVAILABLE"
  | "DETECTION_STATE_INVALID"
  | "SESSION_MISMATCH"
  | "DEPARTURE_NOT_DETECTED"
  | "DISPATCH_ALREADY_STARTED"
  | "REMINDER_ALREADY_SENT";

export type ParkingDepartureDispatchEligibility =
  | { readonly eligible: true }
  | {
      readonly eligible: false;
      readonly reason: ParkingDepartureDispatchIneligibilityReason;
    };

export interface EvaluateParkingDepartureReadingInput {
  readonly state: ParkingDepartureDetectionState;
  readonly parkedLocation: LocationCoordinates;
  readonly reading: ParkingDepartureLocationSample;
  /** Processing time in Unix milliseconds. Defaults to Date.now(). */
  readonly now?: number;
  readonly config?: Partial<ParkingDepartureConfig>;
}

export interface EvaluateParkingDepartureBatchInput {
  readonly state: ParkingDepartureDetectionState;
  readonly parkedLocation: LocationCoordinates;
  readonly readings: readonly ParkingDepartureLocationSample[];
  /** Processing time in Unix milliseconds. Defaults to Date.now(). */
  readonly now?: number;
  readonly config?: Partial<ParkingDepartureConfig>;
}

export type ParkingDepartureIgnoredReadingReason =
  | "INVALID_CONFIGURATION"
  | "INVALID_PROCESSING_TIMESTAMP"
  | "INVALID_DETECTION_STATE"
  | "INVALID_PARKED_LOCATION"
  | "PARKED_LOCATION_ACCURACY_UNUSABLE"
  | "INVALID_READING_COORDINATES"
  | "INVALID_READING_TIMESTAMP"
  | "INVALID_READING_ACCURACY"
  | "READING_ACCURACY_UNUSABLE"
  | "STALE_READING"
  | "FUTURE_READING"
  | "DUPLICATE_READING"
  | "OUT_OF_ORDER_READING"
  | "DISPATCH_ALREADY_STARTED"
  | "REMINDER_ALREADY_SENT";

export type ParkingDepartureEvaluationKind =
  | "ignored"
  | "inside"
  | "inside_reset"
  | "outside_candidate"
  | "departure_detected"
  | "departure_already_detected";

interface ParkingDepartureEvaluationBase {
  readonly state: ParkingDepartureDetectionState;
  readonly rawDistanceMeters: number | null;
  readonly conservativeDistanceMeters: number | null;
  readonly shouldDispatchReminder: boolean;
}

export type ParkingDepartureReadingEvaluation =
  | (ParkingDepartureEvaluationBase & {
      readonly kind: "ignored";
      readonly reason: ParkingDepartureIgnoredReadingReason;
    })
  | (ParkingDepartureEvaluationBase & {
      readonly kind: Exclude<ParkingDepartureEvaluationKind, "ignored">;
      readonly reason: null;
    });

export interface ParkingDepartureBatchEvaluation {
  readonly state: ParkingDepartureDetectionState;
  /** Results are ordered by reading timestamp; the input array is not mutated. */
  readonly evaluations: readonly ParkingDepartureReadingEvaluation[];
  readonly shouldDispatchReminder: boolean;
}

export type ParkingDepartureMetadataTransitionError =
  | "INVALID_TIMESTAMP"
  | "INVALID_CONFIGURATION"
  | "INVALID_DETECTION_STATE"
  | "DEPARTURE_NOT_DETECTED"
  | "DISPATCH_ALREADY_STARTED"
  | "DISPATCH_NOT_STARTED"
  | "DISPATCH_ALREADY_FAILED"
  | "REMINDER_ALREADY_SENT"
  | "TIMESTAMP_OUT_OF_ORDER";

export interface ParkingDepartureMetadataTransitionOptions {
  readonly now?: number;
  readonly config?: Partial<ParkingDepartureConfig>;
}

export type ParkingDepartureMetadataTransitionResult =
  | {
      readonly success: true;
      readonly state: ParkingDepartureDetectionState;
    }
  | {
      readonly success: false;
      readonly state: ParkingDepartureDetectionState;
      readonly reason: ParkingDepartureMetadataTransitionError;
    };

export interface RestoreParkingDepartureStateOptions {
  readonly now?: number;
  readonly config?: Partial<ParkingDepartureConfig>;
}
