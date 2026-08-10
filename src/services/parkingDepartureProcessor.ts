import type { ParkingSession } from "../types/parkingSession";
import type {
  ParkingDepartureBatchEvaluation,
  ParkingDepartureLocationSample,
} from "../types/parkingReminder";
import {
  createParkingDepartureState,
  evaluateParkingDepartureBatch,
  getParkingDepartureMonitoringEligibility,
} from "../utils/parkingDepartureDetector";
import { stopParkingDepartureMonitoring } from "./backgroundLocationService";
import {
  getNotificationPermissionStatus,
  scheduleParkingDepartureReminder,
} from "./notificationService";
import {
  claimParkingDepartureDispatch,
  clearParkingDepartureState,
  getAuthoritativeParkingReminderPreference,
  mutateParkingDepartureState,
  recordParkingDepartureReminderFailed,
  recordParkingDepartureReminderSent,
} from "./parkingReminderStorage";
import { getAuthoritativeParkingSessionSnapshot } from "./parkingSessionPersistence";

/** The only fields consumed from Expo's LocationObject payload. */
export interface ParkingDepartureNativeLocation {
  readonly timestamp: number;
  readonly coords: {
    readonly latitude: number;
    readonly longitude: number;
    readonly accuracy: number | null;
  };
}

export type ParkingDepartureProcessorOutcome =
  | "no-locations"
  | "evaluated"
  | "monitoring-stopped"
  | "notification-unavailable"
  | "dispatch-not-claimed"
  | "reminder-scheduled"
  | "reminder-schedule-failed"
  | "processing-error";

export interface ParkingDepartureProcessorResult {
  readonly outcome: ParkingDepartureProcessorOutcome;
  readonly processedLocations: number;
  readonly reason?: string;
}

export interface ParkingDepartureProcessorDependencies {
  readonly now: () => number;
  readonly readSession: () => Promise<ParkingSession | null>;
  readonly readPreference: typeof getAuthoritativeParkingReminderPreference;
  readonly mutateState: typeof mutateParkingDepartureState;
  readonly clearState: typeof clearParkingDepartureState;
  readonly claimDispatch: typeof claimParkingDepartureDispatch;
  readonly recordReminderSent: typeof recordParkingDepartureReminderSent;
  readonly recordReminderFailed: typeof recordParkingDepartureReminderFailed;
  readonly getNotificationPermission: typeof getNotificationPermissionStatus;
  readonly scheduleReminder: typeof scheduleParkingDepartureReminder;
  readonly stopMonitoring: typeof stopParkingDepartureMonitoring;
  readonly createState: typeof createParkingDepartureState;
  readonly evaluateBatch: typeof evaluateParkingDepartureBatch;
  readonly getMonitoringEligibility: typeof getParkingDepartureMonitoringEligibility;
}

type DetectorMutationResult =
  | {
      readonly kind: "evaluated";
      readonly evaluation: ParkingDepartureBatchEvaluation;
    }
  | {
      readonly kind: "state-unavailable" | "session-mismatch";
    };

interface DispatchAuthority {
  readonly authorized: boolean;
  readonly session: ParkingSession | null;
}

class ParkingDepartureStateUnavailableError extends Error {}

const defaultDependencies: ParkingDepartureProcessorDependencies = {
  now: Date.now,
  readSession: getAuthoritativeParkingSessionSnapshot,
  readPreference: getAuthoritativeParkingReminderPreference,
  mutateState: mutateParkingDepartureState,
  clearState: clearParkingDepartureState,
  claimDispatch: claimParkingDepartureDispatch,
  recordReminderSent: recordParkingDepartureReminderSent,
  recordReminderFailed: recordParkingDepartureReminderFailed,
  getNotificationPermission: getNotificationPermissionStatus,
  scheduleReminder: scheduleParkingDepartureReminder,
  stopMonitoring: stopParkingDepartureMonitoring,
  createState: createParkingDepartureState,
  evaluateBatch: evaluateParkingDepartureBatch,
  getMonitoringEligibility: getParkingDepartureMonitoringEligibility,
};

function toLocationSamples(
  locations: readonly ParkingDepartureNativeLocation[],
): readonly ParkingDepartureLocationSample[] {
  return locations.map(({ coords, timestamp }) => ({
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    timestamp,
  }));
}

async function safelyStopMonitoring(
  dependencies: ParkingDepartureProcessorDependencies,
): Promise<void> {
  try {
    await dependencies.stopMonitoring();
  } catch {
    // The native task may already be unavailable or unregistered.
  }
}

async function safelyClearStateAndStop(
  dependencies: ParkingDepartureProcessorDependencies,
): Promise<void> {
  try {
    await dependencies.clearState();
  } catch {
    // Stopping native updates is still important when storage is unavailable.
  }

  await safelyStopMonitoring(dependencies);
}

async function stopForIneligibleSession(
  dependencies: ParkingDepartureProcessorDependencies,
  session: ParkingSession | null,
  reason: string,
): Promise<void> {
  const canReturnToActive =
    session?.status === "stopping" ||
    session?.status === "awaiting_stop_confirmation";
  const shouldPreserveTerminalClaim =
    session !== null &&
    ((reason === "SESSION_NOT_ACTIVE" && canReturnToActive) ||
      (reason === "REMINDERS_DISABLED" && session.status === "active"));

  if (!shouldPreserveTerminalClaim || !session) {
    await safelyClearStateAndStop(dependencies);
    return;
  }

  try {
    await dependencies.mutateState(
      (snapshot) => {
        if (
          snapshot.source === "corrupt" ||
          snapshot.source === "unavailable"
        ) {
          throw new ParkingDepartureStateUnavailableError();
        }

        const state = snapshot.state;
        const preserveTerminalClaim =
          state?.sessionId === session.id &&
          (state.reminderDispatchStartedAt !== null ||
            state.reminderSentAt !== null ||
            state.reminderDispatchFailedAt !== null);

        return {
          state: preserveTerminalClaim ? state : null,
          result: undefined,
        };
      },
      dependencies.now(),
    );
  } catch {
    // Never remove a terminal claim if its preservation cannot be confirmed.
  }

  await safelyStopMonitoring(dependencies);
}

async function readDispatchAuthority(
  dependencies: ParkingDepartureProcessorDependencies,
  expectedSessionId: string,
): Promise<DispatchAuthority> {
  const [session, preference] = await Promise.all([
    dependencies.readSession(),
    dependencies.readPreference(),
  ]);

  return {
    authorized:
      preference.enabled &&
      session?.id === expectedSessionId &&
      session.status === "active",
    session,
  };
}

function result(
  outcome: ParkingDepartureProcessorOutcome,
  processedLocations: number,
  reason?: string,
): ParkingDepartureProcessorResult {
  return reason
    ? { outcome, processedLocations, reason }
    : { outcome, processedLocations };
}

/**
 * Creates a serialized processor suitable for both the real headless task and
 * dependency-injected probes. It never prompts, changes parking-session state,
 * stops parking, or invokes SMS.
 */
export function createParkingDepartureProcessor(
  dependencies: ParkingDepartureProcessorDependencies = defaultDependencies,
): (
  locations: readonly ParkingDepartureNativeLocation[],
) => Promise<ParkingDepartureProcessorResult> {
  let processingQueue: Promise<unknown> = Promise.resolve();

  const processBatch = async (
    locations: readonly ParkingDepartureNativeLocation[],
  ): Promise<ParkingDepartureProcessorResult> => {
    const processedLocations = locations.length;

    try {
      const [session, preference] = await Promise.all([
        dependencies.readSession(),
        dependencies.readPreference(),
      ]);
      const monitoringEligibility = dependencies.getMonitoringEligibility({
        remindersEnabled: preference.enabled,
        session,
      });

      if (!monitoringEligibility.eligible) {
        await stopForIneligibleSession(
          dependencies,
          session,
          monitoringEligibility.reason,
        );
        return result(
          "monitoring-stopped",
          processedLocations,
          monitoringEligibility.reason,
        );
      }

      if (locations.length === 0) {
        return result("no-locations", 0);
      }

      const startedAt = session?.startedAt
        ? Date.parse(session.startedAt)
        : Number.NaN;
      const samples = toLocationSamples(locations).filter(
        (sample) =>
          !Number.isFinite(sample.timestamp) ||
          !Number.isFinite(startedAt) ||
          sample.timestamp >= startedAt,
      );
      const processedAt = dependencies.now();
      let detectorResult: DetectorMutationResult;

      try {
        detectorResult = await dependencies.mutateState<DetectorMutationResult>(
          (snapshot) => {
            if (
              snapshot.source === "corrupt" ||
              snapshot.source === "unavailable"
            ) {
              // Abort the mutation so corrupt/unknown raw metadata is not
              // deleted and later mistaken for a never-dispatched session.
              throw new ParkingDepartureStateUnavailableError();
            }

            if (
              snapshot.state &&
              snapshot.state.sessionId !== monitoringEligibility.sessionId
            ) {
              return {
                state: null,
                result: { kind: "session-mismatch" },
              };
            }

            const state =
              snapshot.state ??
              dependencies.createState(monitoringEligibility.sessionId);
            const evaluation = dependencies.evaluateBatch({
              state,
              parkedLocation: monitoringEligibility.startLocation,
              readings: samples,
              now: processedAt,
            });

            return {
              state: evaluation.state,
              result: { kind: "evaluated", evaluation },
            };
          },
          processedAt,
        );
      } catch (error) {
        if (error instanceof ParkingDepartureStateUnavailableError) {
          await safelyStopMonitoring(dependencies);
          return result(
            "monitoring-stopped",
            processedLocations,
            "state-unavailable",
          );
        }

        throw error;
      }

      if (detectorResult.kind !== "evaluated") {
        if (detectorResult.kind === "session-mismatch") {
          await safelyClearStateAndStop(dependencies);
        } else {
          await safelyStopMonitoring(dependencies);
        }
        return result(
          "monitoring-stopped",
          processedLocations,
          detectorResult.kind,
        );
      }

      const detectionState = detectorResult.evaluation.state;

      if (
        detectionState.reminderDispatchStartedAt !== null ||
        detectionState.reminderSentAt !== null ||
        detectionState.reminderDispatchFailedAt !== null
      ) {
        await safelyStopMonitoring(dependencies);
        return result("monitoring-stopped", processedLocations, "dispatch-terminal");
      }

      if (detectionState.departureDetectedAt === null) {
        return result("evaluated", processedLocations);
      }

      // This is a read-only preflight. A headless task must never prompt. The
      // result is acted on only after the once-only dispatch claim is durable.
      const notificationPermission =
        await dependencies.getNotificationPermission();

      // Re-read authority immediately before reserving the once-only dispatch.
      const beforeClaim = await readDispatchAuthority(
        dependencies,
        monitoringEligibility.sessionId,
      );

      if (!beforeClaim.authorized) {
        await safelyClearStateAndStop(dependencies);
        return result("monitoring-stopped", processedLocations, "authority-revoked");
      }

      const claimAt = Math.max(
        dependencies.now(),
        detectionState.departureDetectedAt,
      );
      const claim = await dependencies.claimDispatch(
        monitoringEligibility.sessionId,
        claimAt,
      );

      if (!claim.claimed) {
        if (
          claim.reason === "DISPATCH_ALREADY_STARTED" ||
          claim.reason === "REMINDER_ALREADY_SENT"
        ) {
          await safelyStopMonitoring(dependencies);
        }

        return result(
          "dispatch-not-claimed",
          processedLocations,
          claim.reason,
        );
      }

      const dispatchTerminalAt = (): number =>
        Math.max(
          dependencies.now(),
          claim.state.reminderDispatchStartedAt ?? claimAt,
        );

      if (
        !notificationPermission.success ||
        !notificationPermission.value.canDeliver
      ) {
        await dependencies.recordReminderFailed(
          monitoringEligibility.sessionId,
          dispatchTerminalAt(),
        );
        await safelyStopMonitoring(dependencies);
        return result(
          "notification-unavailable",
          processedLocations,
          notificationPermission.success
            ? notificationPermission.value.state
            : notificationPermission.code,
        );
      }

      // A user may stop parking or disable reminders while the claim is saved.
      const afterClaim = await readDispatchAuthority(
        dependencies,
        monitoringEligibility.sessionId,
      );

      if (!afterClaim.authorized || !afterClaim.session) {
        await dependencies.recordReminderFailed(
          monitoringEligibility.sessionId,
          dispatchTerminalAt(),
        );
        await safelyStopMonitoring(dependencies);
        return result("monitoring-stopped", processedLocations, "authority-revoked");
      }

      let reminderScheduled = false;

      try {
        const scheduled = await dependencies.scheduleReminder({
          sessionId: afterClaim.session.id,
          zoneCode: afterClaim.session.zoneCode,
          plate: afterClaim.session.plate,
        });
        reminderScheduled = scheduled.success;
      } catch {
        reminderScheduled = false;
      }

      const terminalAt = dispatchTerminalAt();

      if (reminderScheduled) {
        await dependencies.recordReminderSent(
          monitoringEligibility.sessionId,
          terminalAt,
        );
      } else {
        await dependencies.recordReminderFailed(
          monitoringEligibility.sessionId,
          terminalAt,
        );
      }

      await safelyStopMonitoring(dependencies);

      return result(
        reminderScheduled ? "reminder-scheduled" : "reminder-schedule-failed",
        processedLocations,
      );
    } catch {
      // Fail closed. Foreground reconciliation can restart a transient failure.
      await safelyStopMonitoring(dependencies);
      return result("processing-error", processedLocations);
    }
  };

  return (locations) => {
    const queued = processingQueue.then(
      () => processBatch(locations),
      () => processBatch(locations),
    );
    processingQueue = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  };
}

export const processParkingDepartureLocations =
  createParkingDepartureProcessor();
