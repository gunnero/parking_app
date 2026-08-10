import { create } from "zustand";

import {
  reconcileParkingDepartureMonitoring,
  requestParkingReminderSetup,
  type ParkingReminderRuntimeSnapshot,
} from "../services/parkingReminderController";
import {
  getAuthoritativeParkingReminderPreference,
  publishHydratedParkingReminderPreference,
  readParkingDepartureState,
  readParkingReminderPreference,
  writeParkingReminderPreference,
} from "../services/parkingReminderStorage";
import type { ParkingSession } from "../types/parkingSession";
import type { ParkingDepartureDetectionState } from "../types/parkingReminder";

const INITIAL_RUNTIME: ParkingReminderRuntimeSnapshot = {
  status: "idle",
  reason: "Checking reminder availability…",
  monitoringActive: false,
  canAskLocationAgain: false,
  canAskNotificationAgain: false,
};
const UNSAVED_PREFERENCE_ERROR =
  "The reminder preference is only OFF for this app session. Retry to save it on this device.";

export interface ParkingReminderStoreState {
  enabled: boolean;
  hasHydrated: boolean;
  isBusy: boolean;
  isUserActionBusy: boolean;
  runtime: ParkingReminderRuntimeSnapshot;
  detectorState: ParkingDepartureDetectionState | null;
  error: string | null;
  preferenceNeedsSave: boolean;
  hydrate: () => Promise<void>;
  refreshFromStorage: () => Promise<void>;
  reconcile: (session: ParkingSession | null) => Promise<void>;
  setEnabled: (
    enabled: boolean,
    session: ParkingSession | null,
  ) => Promise<void>;
  setupPermissions: (session: ParkingSession | null) => Promise<void>;
  clearError: () => void;
}

let latestRuntimeRequest = 0;

function safeError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

export const useParkingReminderStore = create<ParkingReminderStoreState>()(
  (set, get) => ({
    enabled: true,
    hasHydrated: false,
    isBusy: false,
    isUserActionBusy: false,
    runtime: INITIAL_RUNTIME,
    detectorState: null,
    error: null,
    preferenceNeedsSave: false,

    hydrate: async () => {
      if (get().hasHydrated) {
        return;
      }

      try {
        const [preference, detector] = await Promise.all([
          readParkingReminderPreference(),
          readParkingDepartureState(),
        ]);
        const persistenceError =
          preference.source === "corrupt" ||
          preference.source === "unavailable" ||
          detector.source === "corrupt" ||
          detector.source === "unavailable";

        publishHydratedParkingReminderPreference(preference.enabled);

        set({
          enabled: preference.enabled,
          detectorState: detector.state,
          preferenceNeedsSave:
            preference.source === "corrupt" ||
            preference.source === "unavailable",
          error: persistenceError
            ? "Reminder settings could not be restored safely."
            : null,
          hasHydrated: true,
        });
      } catch (error) {
        publishHydratedParkingReminderPreference(false);
        set({
          enabled: false,
          detectorState: null,
          preferenceNeedsSave: true,
          error: safeError(
            error,
            "Reminder settings could not be restored safely.",
          ),
          hasHydrated: true,
        });
      }
    },

    refreshFromStorage: async () => {
      try {
        const [preference, detector] = await Promise.all([
          getAuthoritativeParkingReminderPreference(),
          readParkingDepartureState(),
        ]);
        publishHydratedParkingReminderPreference(preference.enabled);
        const persistenceError =
          preference.source === "corrupt" ||
          preference.source === "unavailable" ||
          detector.source === "corrupt" ||
          detector.source === "unavailable";
        set({
          enabled: preference.enabled,
          detectorState: detector.state,
          error: get().preferenceNeedsSave
            ? UNSAVED_PREFERENCE_ERROR
            : persistenceError
              ? "Reminder settings could not be restored safely."
              : null,
        });
      } catch (error) {
        set({
          error: safeError(
            error,
            "Reminder settings could not be refreshed.",
          ),
        });
      }
    },

    reconcile: async (session) => {
      if (!get().hasHydrated) {
        return;
      }

      const requestId = ++latestRuntimeRequest;
      set({ isBusy: true });

      try {
        const runtime = await reconcileParkingDepartureMonitoring({
          session,
          enabled: get().enabled,
        });
        const detector = await readParkingDepartureState();

        if (requestId === latestRuntimeRequest) {
          set({
            runtime,
            detectorState: detector.state,
            error: get().preferenceNeedsSave
              ? UNSAVED_PREFERENCE_ERROR
              : null,
            isBusy: false,
          });
        }
      } catch (error) {
        if (requestId === latestRuntimeRequest) {
          set({
            runtime: {
              ...INITIAL_RUNTIME,
              status: "error",
              reason: "Parking reminder availability could not be checked.",
            },
            error: safeError(
              error,
              "Parking reminder availability could not be checked.",
            ),
            isBusy: false,
          });
        }
      }
    },

    setEnabled: async (enabled, session) => {
      const requestId = ++latestRuntimeRequest;
      set({ isBusy: true, isUserActionBusy: true, error: null });

      if (!enabled) {
        // OFF is fail-closed in memory before storage so an already queued task
        // cannot notify while the native stop is being reconciled.
        publishHydratedParkingReminderPreference(false);
        set({ enabled: false, preferenceNeedsSave: true });
        let preferenceError: string | null = null;

        try {
          await writeParkingReminderPreference(false);
          set({ preferenceNeedsSave: false });
        } catch (error) {
          preferenceError = safeError(
            error,
            UNSAVED_PREFERENCE_ERROR,
          );
        }

        try {
          const runtime = await reconcileParkingDepartureMonitoring({
            session,
            enabled: false,
          });
          const detector = await readParkingDepartureState();

          if (requestId === latestRuntimeRequest) {
            set({
              runtime,
              detectorState: detector.state,
              error: preferenceError,
              isBusy: false,
              isUserActionBusy: false,
            });
          }
        } catch (error) {
          if (requestId === latestRuntimeRequest) {
            const cleanupError = safeError(
              error,
              "Background monitoring could not be stopped.",
            );
            set({
              runtime: {
                ...INITIAL_RUNTIME,
                status: "error",
                reason: cleanupError,
              },
              error: preferenceError
                ? `${preferenceError} ${cleanupError}`
                : cleanupError,
              isBusy: false,
              isUserActionBusy: false,
            });
          }
        }

        return;
      }

      try {
        await writeParkingReminderPreference(true);
        publishHydratedParkingReminderPreference(true);
        set({ enabled: true, preferenceNeedsSave: false });
        const runtime = await reconcileParkingDepartureMonitoring({
          session,
          enabled: true,
        });
        const detector = await readParkingDepartureState();

        if (requestId === latestRuntimeRequest) {
          set({
            runtime,
            detectorState: detector.state,
            isBusy: false,
            isUserActionBusy: false,
          });
        }
      } catch (error) {
        if (requestId === latestRuntimeRequest) {
          set({
            error: safeError(
              error,
              "The parking reminder preference could not be saved.",
            ),
            isBusy: false,
            isUserActionBusy: false,
          });
        }
      }
    },

    setupPermissions: async (session) => {
      if (!get().hasHydrated || !get().enabled) {
        return;
      }

      const requestId = ++latestRuntimeRequest;
      set({ isBusy: true, isUserActionBusy: true, error: null });

      try {
        const runtime = await requestParkingReminderSetup({
          session,
          enabled: true,
        });
        const detector = await readParkingDepartureState();

        if (requestId === latestRuntimeRequest) {
          set({
            runtime,
            detectorState: detector.state,
            isBusy: false,
            isUserActionBusy: false,
          });
        }
      } catch (error) {
        if (requestId === latestRuntimeRequest) {
          set({
            error: safeError(
              error,
              "Parking reminder permissions could not be updated.",
            ),
            isBusy: false,
            isUserActionBusy: false,
          });
        }
      }
    },

    clearError: () => set({ error: null }),
  }),
);

export const selectParkingReminderEnabled = (
  state: ParkingReminderStoreState,
): boolean => state.enabled;

export const selectParkingReminderRuntime = (
  state: ParkingReminderStoreState,
): ParkingReminderRuntimeSnapshot => state.runtime;
