import {
  getBackgroundLocationCapability,
  getBackgroundLocationPermissionStatus,
  requestParkingReminderBackgroundPermission,
  requestParkingReminderForegroundPermission,
  startParkingDepartureMonitoring,
  stopParkingDepartureMonitoring,
} from "./backgroundLocationService";
import {
  getNotificationPermissionStatus,
  requestParkingReminderNotificationPermission,
} from "./notificationService";
import {
  clearParkingDepartureState,
  ensureParkingDepartureState,
  getAuthoritativeParkingReminderPreference,
  mutateParkingDepartureState,
  readParkingDepartureState,
} from "./parkingReminderStorage";
import { getAuthoritativeParkingSessionSnapshot } from "./parkingSessionPersistence";
import type { ParkingSession } from "../types/parkingSession";
import { createParkingDepartureState } from "../utils/parkingDepartureDetector";
import { getParkingDepartureMonitoringEligibility } from "../utils/parkingDepartureDetector";

export type ParkingReminderRuntimeStatus =
  | "idle"
  | "disabled"
  | "inactive"
  | "missing-start-location"
  | "unsupported"
  | "permission-required"
  | "monitoring"
  | "monitoring-without-notifications"
  | "reminder-sent"
  | "reminder-failed"
  | "storage-error"
  | "error";

export interface ParkingReminderRuntimeSnapshot {
  readonly status: ParkingReminderRuntimeStatus;
  readonly reason: string;
  readonly monitoringActive: boolean;
  readonly canAskLocationAgain: boolean;
  readonly canAskNotificationAgain: boolean;
}

export interface ReconcileParkingReminderInput {
  readonly session: ParkingSession | null;
  readonly enabled: boolean;
}

const defaultDependencies = {
  getCapability: getBackgroundLocationCapability,
  getLocationPermission: getBackgroundLocationPermissionStatus,
  requestForegroundPermission: requestParkingReminderForegroundPermission,
  requestBackgroundPermission: requestParkingReminderBackgroundPermission,
  startMonitoring: startParkingDepartureMonitoring,
  stopMonitoring: stopParkingDepartureMonitoring,
  getNotificationPermission: getNotificationPermissionStatus,
  requestNotificationPermission:
    requestParkingReminderNotificationPermission,
  readAuthoritativeSession: getAuthoritativeParkingSessionSnapshot,
  readPreference: getAuthoritativeParkingReminderPreference,
  readDetectorState: readParkingDepartureState,
  ensureDetectorState: ensureParkingDepartureState,
  clearDetectorState: clearParkingDepartureState,
  mutateDetectorState: mutateParkingDepartureState,
};

export type ParkingReminderControllerDependencies = typeof defaultDependencies;

let reconciliationQueue: Promise<unknown> = Promise.resolve();

function enqueueReconciliation<T>(operation: () => Promise<T>): Promise<T> {
  const result = reconciliationQueue.then(operation, operation);
  reconciliationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function runtimeSnapshot(
  status: ParkingReminderRuntimeStatus,
  reason: string,
  options: {
    monitoringActive?: boolean;
    canAskLocationAgain?: boolean;
    canAskNotificationAgain?: boolean;
  } = {},
): ParkingReminderRuntimeSnapshot {
  return {
    status,
    reason,
    monitoringActive: options.monitoringActive ?? false,
    canAskLocationAgain: options.canAskLocationAgain ?? false,
    canAskNotificationAgain: options.canAskNotificationAgain ?? false,
  };
}

async function stopQuietly(
  dependencies: ParkingReminderControllerDependencies,
): Promise<string | null> {
  try {
    const result = await dependencies.stopMonitoring();
    return result.success ? null : result.reason;
  } catch {
    // Parking state must never depend on reminder task cleanup succeeding.
    return "Background monitoring could not be stopped.";
  }
}

async function clearPendingStatePreservingTerminalClaim(
  sessionId: string | null,
  dependencies: ParkingReminderControllerDependencies,
): Promise<void> {
  await dependencies.mutateDetectorState((snapshot) => {
    const state = snapshot.state;
    const preserveTerminalClaim =
      state !== null &&
      state.sessionId === sessionId &&
      (state.reminderDispatchStartedAt !== null ||
        state.reminderDispatchFailedAt !== null ||
        state.reminderSentAt !== null);

    return {
      state: preserveTerminalClaim ? state : null,
      result: undefined,
    };
  });
}

async function resetPendingCandidate(
  sessionId: string,
  dependencies: ParkingReminderControllerDependencies,
): Promise<void> {
  await dependencies.mutateDetectorState((snapshot) => {
    if (!snapshot.state) {
      return { state: snapshot.state, result: undefined };
    }

    if (snapshot.state.sessionId !== sessionId) {
      return { state: null, result: undefined };
    }

    if (snapshot.state.reminderDispatchStartedAt !== null) {
      return { state: snapshot.state, result: undefined };
    }

    return {
      state: createParkingDepartureState(sessionId),
      result: undefined,
    };
  });
}

async function reconcileInternal(
  input: ReconcileParkingReminderInput,
  dependencies: ParkingReminderControllerDependencies,
): Promise<ParkingReminderRuntimeSnapshot> {
  const { enabled, session } = input;

  if (!enabled) {
    const stopError = await stopQuietly(dependencies);
    const mayReturnToActive =
      session?.status === "active" ||
      session?.status === "stopping" ||
      session?.status === "awaiting_stop_confirmation";
    await clearPendingStatePreservingTerminalClaim(
      mayReturnToActive ? session.id : null,
      dependencies,
    );

    if (stopError) {
      return runtimeSnapshot(
        "error",
        `Departure reminders are off, but ${stopError}`,
      );
    }

    return runtimeSnapshot("disabled", "Departure reminders are off.");
  }

  if (!session) {
    const stopError = await stopQuietly(dependencies);
    await dependencies.clearDetectorState();
    if (stopError) {
      return runtimeSnapshot("error", stopError);
    }
    return runtimeSnapshot("inactive", "No active parking session.");
  }

  if (session.status !== "active") {
    const stopError = await stopQuietly(dependencies);

    if (session.status === "completed" || session.status === "failed") {
      await dependencies.clearDetectorState();
    } else {
      await resetPendingCandidate(session.id, dependencies);
    }

    if (stopError) {
      return runtimeSnapshot("error", stopError);
    }

    return runtimeSnapshot(
      "inactive",
      "Departure monitoring starts only while parking is active.",
    );
  }

  const eligibility = getParkingDepartureMonitoringEligibility({
    remindersEnabled: enabled,
    session,
  });

  if (!eligibility.eligible) {
    await stopQuietly(dependencies);

    if (
      eligibility.reason === "START_LOCATION_UNAVAILABLE" ||
      eligibility.reason === "START_LOCATION_INVALID" ||
      eligibility.reason === "START_LOCATION_ACCURACY_UNUSABLE"
    ) {
      return runtimeSnapshot(
        "missing-start-location",
        "No usable parked location was captured for this session.",
      );
    }

    return runtimeSnapshot(
      "error",
      "This parking session cannot use departure reminders.",
    );
  }

  const detectorSnapshot = await dependencies.readDetectorState();

  if (
    detectorSnapshot.source === "corrupt" ||
    detectorSnapshot.source === "unavailable"
  ) {
    await stopQuietly(dependencies);
    return runtimeSnapshot(
      "storage-error",
      "Reminder state could not be restored safely.",
    );
  }

  const ensuredDetector = await dependencies.ensureDetectorState(session.id);

  if (!ensuredDetector.state) {
    await stopQuietly(dependencies);
    return runtimeSnapshot(
      "storage-error",
      "Reminder state could not be prepared safely.",
    );
  }

  if (ensuredDetector.state.reminderSentAt !== null) {
    await stopQuietly(dependencies);
    return runtimeSnapshot(
      "reminder-sent",
      "Departure reminder sent. Parking is still active.",
    );
  }

  if (
    ensuredDetector.state.reminderDispatchStartedAt !== null ||
    ensuredDetector.state.reminderDispatchFailedAt !== null
  ) {
    await stopQuietly(dependencies);
    return runtimeSnapshot(
      "reminder-failed",
      "A departure reminder delivery was already attempted for this session.",
    );
  }

  const capability = await dependencies.getCapability();

  if (!capability.success) {
    await stopQuietly(dependencies);
    return runtimeSnapshot("unsupported", capability.reason);
  }

  const locationPermission = await dependencies.getLocationPermission();

  if (!locationPermission.success) {
    await stopQuietly(dependencies);
    return runtimeSnapshot("error", locationPermission.reason);
  }

  if (!locationPermission.value.canMonitor) {
    const stopError = await stopQuietly(dependencies);
    if (stopError) {
      return runtimeSnapshot("error", stopError);
    }
    const preciseRequired =
      locationPermission.value.foreground === "granted" &&
      locationPermission.value.precision !== "precise";
    return runtimeSnapshot(
      "permission-required",
      preciseRequired
        ? "Precise location is required for conservative departure reminders."
        : "Background location permission is required.",
      {
        canAskLocationAgain:
          !preciseRequired &&
          (locationPermission.value.canAskForegroundAgain ||
            locationPermission.value.canAskBackgroundAgain),
      },
    );
  }

  const notificationPermission =
    await dependencies.getNotificationPermission();
  const [authoritativeSession, authoritativePreference, latestDetector] =
    await Promise.all([
      dependencies.readAuthoritativeSession(),
      dependencies.readPreference(),
      dependencies.readDetectorState(),
    ]);

  if (
    !authoritativePreference.enabled ||
    authoritativeSession?.id !== session.id ||
    authoritativeSession.status !== "active"
  ) {
    await stopQuietly(dependencies);
    return runtimeSnapshot(
      authoritativePreference.enabled ? "inactive" : "disabled",
      authoritativePreference.enabled
        ? "Parking is no longer active; departure monitoring was not started."
        : "Departure reminders are off.",
    );
  }

  if (
    !latestDetector.state ||
    latestDetector.state.sessionId !== session.id ||
    latestDetector.source !== "stored"
  ) {
    await stopQuietly(dependencies);
    return runtimeSnapshot(
      "storage-error",
      "Reminder state could not be verified before monitoring started.",
    );
  }

  if (latestDetector.state.reminderSentAt !== null) {
    await stopQuietly(dependencies);
    return runtimeSnapshot(
      "reminder-sent",
      "Departure reminder sent. Parking is still active.",
    );
  }

  if (
    latestDetector.state.reminderDispatchStartedAt !== null ||
    latestDetector.state.reminderDispatchFailedAt !== null
  ) {
    await stopQuietly(dependencies);
    return runtimeSnapshot(
      "reminder-failed",
      "A departure reminder delivery was already attempted for this session.",
    );
  }

  const startResult = await dependencies.startMonitoring();

  if (!startResult.success) {
    return runtimeSnapshot(
      startResult.code === "expo-go-unsupported" ||
        startResult.code === "task-manager-unavailable" ||
        startResult.code === "background-location-unavailable" ||
        startResult.code === "native-configuration-missing"
        ? "unsupported"
        : "error",
      startResult.reason,
    );
  }

  if (
    !notificationPermission.success ||
    !notificationPermission.value.canDeliver
  ) {
    return runtimeSnapshot(
      "monitoring-without-notifications",
      "Notifications are disabled. Parking still works.",
      {
        monitoringActive: true,
        canAskNotificationAgain:
          notificationPermission.success &&
          notificationPermission.value.canAskAgain,
      },
    );
  }

  return runtimeSnapshot(
    "monitoring",
    "Background departure monitoring is active.",
    { monitoringActive: true },
  );
}

export function reconcileParkingDepartureMonitoring(
  input: ReconcileParkingReminderInput,
  dependencyOverrides: Partial<ParkingReminderControllerDependencies> = {},
): Promise<ParkingReminderRuntimeSnapshot> {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
  return enqueueReconciliation(() => reconcileInternal(input, dependencies));
}

/**
 * Explicit user-action flow. UI must explain background access before calling
 * this function; no permission prompts are performed during normal reconcile.
 */
export function requestParkingReminderSetup(
  input: ReconcileParkingReminderInput,
  dependencyOverrides: Partial<ParkingReminderControllerDependencies> = {},
): Promise<ParkingReminderRuntimeSnapshot> {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };

  return enqueueReconciliation(async () => {
    const capability = await dependencies.getCapability();

    if (!capability.success) {
      return runtimeSnapshot("unsupported", capability.reason);
    }

    let locationPermission = await dependencies.getLocationPermission();

    if (!locationPermission.success) {
      return runtimeSnapshot("error", locationPermission.reason);
    }

    if (
      locationPermission.value.foreground !== "granted" ||
      locationPermission.value.precision !== "precise"
    ) {
      const foreground = await dependencies.requestForegroundPermission();

      if (!foreground.success) {
        return runtimeSnapshot("permission-required", foreground.reason);
      }

      locationPermission = await dependencies.getLocationPermission();
    }

    if (
      !locationPermission.success ||
      locationPermission.value.foreground !== "granted" ||
      locationPermission.value.precision !== "precise"
    ) {
      return runtimeSnapshot(
        "permission-required",
        "Precise foreground location permission is required.",
        {
          canAskLocationAgain:
            locationPermission.success &&
            locationPermission.value.foreground !== "granted" &&
            locationPermission.value.canAskForegroundAgain,
        },
      );
    }

    if (locationPermission.value.background !== "granted") {
      const background = await dependencies.requestBackgroundPermission();

      if (!background.success || !background.value.canMonitor) {
        return runtimeSnapshot(
          "permission-required",
          background.success
            ? "Background location permission was not granted."
            : background.reason,
          {
            canAskLocationAgain:
              background.success &&
              background.value.canAskBackgroundAgain,
          },
        );
      }
    }

    const notificationPermission =
      await dependencies.getNotificationPermission();

    if (
      notificationPermission.success &&
      !notificationPermission.value.canDeliver &&
      (notificationPermission.value.state === "undetermined" ||
        notificationPermission.value.canAskAgain)
    ) {
      await dependencies.requestNotificationPermission();
    }

    return reconcileInternal(input, dependencies);
  });
}
