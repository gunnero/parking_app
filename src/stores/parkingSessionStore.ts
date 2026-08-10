import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  ParkingSession,
  ParkingSessionRequestResult,
  ParkingSessionStatus,
} from "../types/parkingSession";
import {
  PARKING_SESSION_STORAGE_KEY,
  PARKING_SESSION_STORAGE_VERSION,
  publishHydratedParkingSessionSnapshot,
} from "../services/parkingSessionPersistence";
import { createParkingSessionDraft } from "../utils/parkingSmsEligibility";
import {
  canResetParkingSession,
  restoreParkingSession,
  transitionParkingSession,
  type ParkingSessionEvent,
} from "../utils/parkingSessionState";

export {
  PARKING_SESSION_STORAGE_KEY,
  PARKING_SESSION_STORAGE_VERSION,
} from "../services/parkingSessionPersistence";

export type PrepareParkingSessionInput = Parameters<
  typeof createParkingSessionDraft
>[0];

export type ParkingSessionMutationResult =
  | { success: true; session: ParkingSession | null }
  | { success: false; error: string };

export interface ParkingSessionStoreState {
  session: ParkingSession | null;
  hasHydrated: boolean;
  operationError: string | null;
  smsFlowInFlight: boolean;
  prepareSession: (
    input: PrepareParkingSessionInput,
  ) => ParkingSessionMutationResult;
  markStartRequestPrepared: (
    result: ParkingSessionRequestResult,
  ) => ParkingSessionMutationResult;
  confirmSessionManually: () => ParkingSessionMutationResult;
  beginStop: () => ParkingSessionMutationResult;
  markStopRequestPrepared: (
    result: ParkingSessionRequestResult,
  ) => ParkingSessionMutationResult;
  returnToActiveSession: () => ParkingSessionMutationResult;
  completeSessionManually: () => ParkingSessionMutationResult;
  cancelPendingSession: () => ParkingSessionMutationResult;
  resetSession: () => ParkingSessionMutationResult;
  beginSmsFlow: () => boolean;
  finishSmsFlow: () => void;
  setOperationError: (message: string) => void;
  clearOperationError: () => void;
}

type PersistedParkingSessionState = Pick<
  ParkingSessionStoreState,
  "session"
>;

function nowTimestamp(): string {
  return new Date().toISOString();
}

let markHydrationFinished: (() => void) | undefined;

export const useParkingSessionStore = create<ParkingSessionStoreState>()(
  persist(
    (set, get) => {
      const failure = (error: string): ParkingSessionMutationResult => ({
        success: false,
        error,
      });

      const requireHydration = (): ParkingSessionMutationResult | null =>
        get().hasHydrated
          ? null
          : failure(
              "Parking session data is still loading. Please try again shortly.",
            );

      const applyTransition = (
        event: ParkingSessionEvent,
      ): ParkingSessionMutationResult => {
        const hydrationFailure = requireHydration();

        if (hydrationFailure) {
          return hydrationFailure;
        }

        const session = get().session;

        if (!session) {
          return failure("There is no parking session to update.");
        }

        const result = transitionParkingSession(session, event);

        if (!result.success) {
          return failure(result.error);
        }

        set({ session: result.session, operationError: null });
        return { success: true, session: result.session };
      };

      markHydrationFinished = () => set({ hasHydrated: true });

      return {
        session: null,
        hasHydrated: false,
        operationError: null,
        smsFlowInFlight: false,

        prepareSession: (input) => {
          const hydrationFailure = requireHydration();

          if (hydrationFailure) {
            return hydrationFailure;
          }

          if (get().session) {
            return failure(
              "Reset the current parking session before preparing another one.",
            );
          }

          try {
            const draftResult = createParkingSessionDraft(input);

            if (!draftResult.success) {
              return failure(draftResult.reason);
            }

            const session = restoreParkingSession(draftResult.session);

            if (!session || session.status !== "preparing") {
              return failure(
                "The prepared parking session is invalid and was not saved.",
              );
            }

            set({ session, operationError: null });
            return { success: true, session };
          } catch {
            return failure(
              "The parking session could not be prepared. Please try again.",
            );
          }
        },

        markStartRequestPrepared: (result) =>
          applyTransition({
            type: "START_REQUEST_PREPARED",
            at: nowTimestamp(),
            result,
          }),

        confirmSessionManually: () =>
          applyTransition({ type: "CONFIRM_START", at: nowTimestamp() }),

        beginStop: () => applyTransition({ type: "BEGIN_STOP" }),

        markStopRequestPrepared: (result) =>
          applyTransition({
            type: "STOP_REQUEST_PREPARED",
            at: nowTimestamp(),
            result,
          }),

        returnToActiveSession: () =>
          applyTransition({ type: "RETURN_TO_ACTIVE" }),

        completeSessionManually: () =>
          applyTransition({ type: "CONFIRM_STOP", at: nowTimestamp() }),

        cancelPendingSession: () =>
          applyTransition({ type: "CANCEL_PENDING" }),

        resetSession: () => {
          const hydrationFailure = requireHydration();

          if (hydrationFailure) {
            return hydrationFailure;
          }

          const session = get().session;

          if (!canResetParkingSession(session)) {
            return failure(
              "Only a completed or failed parking session can be reset.",
            );
          }

          set({ session: null, operationError: null });
          return { success: true, session: null };
        },

        beginSmsFlow: () => {
          if (get().smsFlowInFlight) {
            return false;
          }

          set({ smsFlowInFlight: true });
          return true;
        },

        finishSmsFlow: () => set({ smsFlowInFlight: false }),

        setOperationError: (message) => {
          const error = message.trim();
          set({
            operationError:
              error || "The parking operation could not be completed.",
          });
        },

        clearOperationError: () => set({ operationError: null }),
      };
    },
    {
      name: PARKING_SESSION_STORAGE_KEY,
      version: PARKING_SESSION_STORAGE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedParkingSessionState => ({
        session: state.session,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        session: restoreParkingSession(
          (persistedState as Partial<PersistedParkingSessionState> | undefined)
            ?.session,
        ),
      }),
      onRehydrateStorage: () => () => {
        markHydrationFinished?.();
      },
    },
  ),
);

export const selectCurrentParkingSession = (
  state: ParkingSessionStoreState,
): ParkingSession | null => state.session;

export const selectParkingSessionStatus = (
  state: ParkingSessionStoreState,
): ParkingSessionStatus | null => state.session?.status ?? null;

export const selectHasBlockingParkingSession = (
  state: ParkingSessionStoreState,
): boolean =>
  state.session !== null && !canResetParkingSession(state.session);

export const selectCanResetParkingSession = (
  state: ParkingSessionStoreState,
): boolean => canResetParkingSession(state.session);

useParkingSessionStore.subscribe((state, previousState) => {
  if (
    state.hasHydrated &&
    (!previousState.hasHydrated || state.session !== previousState.session)
  ) {
    publishHydratedParkingSessionSnapshot(state.session);
  }
});
