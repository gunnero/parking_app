import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type { ParkingHistoryRecord } from "../types/parkingHistory";
import type { ParkingSession } from "../types/parkingSession";
import {
  createParkingHistoryRecord,
  restoreParkingHistoryRecord,
  sortParkingHistoryNewestFirst,
} from "../utils/parkingHistory";

export const PARKING_HISTORY_STORAGE_KEY = "parkingapp-parking-history";
export const PARKING_HISTORY_STORAGE_VERSION = 1;

type MaybePromise<T> = T | Promise<T>;
type UnknownRecord = Record<string, unknown>;

/** A narrow seam used by the deterministic development preview harness. */
export interface ParkingHistoryStorageAdapter {
  getItem: (key: string) => MaybePromise<string | null>;
  setItem: (key: string, value: string) => MaybePromise<void>;
  removeItem: (key: string) => MaybePromise<void>;
}

export type ParkingHistoryOperationResult =
  | { success: true }
  | { success: false; error: string };

export type AppendParkingHistoryResult =
  | {
      success: true;
      record: ParkingHistoryRecord;
      duplicate: boolean;
    }
  | { success: false; error: string };

export type ParkingHistoryHydrationResult =
  | { success: true; rejectedRecordCount: number }
  | { success: false; error: string };

export interface ParkingHistoryStoreState {
  records: ParkingHistoryRecord[];
  hasHydrated: boolean;
  isHydrating: boolean;
  isReadOnly: boolean;
  hydrationError: string | null;
  operationError: string | null;
  hydrate: () => Promise<ParkingHistoryHydrationResult>;
  appendCompletedSession: (
    session: ParkingSession,
  ) => Promise<AppendParkingHistoryResult>;
  getRecordById: (id: string) => ParkingHistoryRecord | null;
  deleteRecord: (id: string) => Promise<ParkingHistoryOperationResult>;
  /** Destructive primitive; presentation callers must confirm explicitly. */
  clearHistory: () => Promise<ParkingHistoryOperationResult>;
  clearOperationError: () => void;
}

interface ParkingHistoryStorageEnvelope {
  readonly version: number;
  readonly records: readonly ParkingHistoryRecord[];
}

interface RestoredRecords {
  readonly records: ParkingHistoryRecord[];
  readonly rejectedRecordCount: number;
}

interface DecodedHistoryEnvelope extends RestoredRecords {
  readonly needsRewrite: boolean;
  readonly warning: string | null;
}

class UnsupportedParkingHistoryVersionError extends Error {
  constructor(readonly storedVersion: number) {
    super(
      `Parking history storage version ${storedVersion} is newer than supported version ${PARKING_HISTORY_STORAGE_VERSION}.`,
    );
    this.name = "UnsupportedParkingHistoryVersionError";
  }
}

const INVALID_HISTORY_WARNING =
  "Some stored parking history was invalid and was removed safely.";
const HISTORY_NOT_READY_ERROR =
  "Parking history is still loading. Please try again shortly.";
const HISTORY_READ_ONLY_ERROR =
  "Parking history is read-only because its stored data could not be loaded safely.";
const HISTORY_APPEND_WRITE_ERROR =
  "Parking history could not be saved. Your completed session remains available so you can try again.";
const HISTORY_MUTATION_WRITE_ERROR =
  "Parking history could not be saved. No history changes were applied.";

let storageAdapter: ParkingHistoryStorageAdapter = AsyncStorage;
let storageQueue: Promise<void> = Promise.resolve();
let hydrationPromise: Promise<ParkingHistoryHydrationResult> | null = null;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalizeRecords(value: unknown): RestoredRecords {
  if (!Array.isArray(value)) {
    return { records: [], rejectedRecordCount: 1 };
  }

  const restoredRecords: ParkingHistoryRecord[] = [];
  let rejectedRecordCount = 0;

  for (const candidate of value) {
    const record = restoreParkingHistoryRecord(candidate);

    if (record) {
      restoredRecords.push(record);
    } else {
      rejectedRecordCount += 1;
    }
  }

  const records: ParkingHistoryRecord[] = [];
  const sessionIds = new Set<string>();
  const recordIds = new Set<string>();

  for (const record of sortParkingHistoryNewestFirst(restoredRecords)) {
    if (sessionIds.has(record.sessionId) || recordIds.has(record.id)) {
      rejectedRecordCount += 1;
      continue;
    }

    sessionIds.add(record.sessionId);
    recordIds.add(record.id);
    records.push(record);
  }

  return { records, rejectedRecordCount };
}

function decodeHistoryEnvelope(value: unknown): DecodedHistoryEnvelope {
  if (!isRecord(value)) {
    return {
      records: [],
      rejectedRecordCount: 1,
      needsRewrite: true,
      warning: INVALID_HISTORY_WARNING,
    };
  }

  const storedVersion = value.version;

  if (
    typeof storedVersion === "number" &&
    Number.isInteger(storedVersion) &&
    storedVersion > PARKING_HISTORY_STORAGE_VERSION
  ) {
    throw new UnsupportedParkingHistoryVersionError(storedVersion);
  }

  if (storedVersion !== 0 && storedVersion !== PARKING_HISTORY_STORAGE_VERSION) {
    return {
      records: [],
      rejectedRecordCount: 1,
      needsRewrite: true,
      warning: INVALID_HISTORY_WARNING,
    };
  }

  const restored = canonicalizeRecords(value.records);
  const canonicalRecordsMatch =
    Array.isArray(value.records) &&
    JSON.stringify(value.records) === JSON.stringify(restored.records);
  const containedInvalidData =
    restored.rejectedRecordCount > 0 || !canonicalRecordsMatch;
  const needsRewrite =
    storedVersion !== PARKING_HISTORY_STORAGE_VERSION ||
    containedInvalidData;

  return {
    ...restored,
    needsRewrite,
    warning: containedInvalidData ? INVALID_HISTORY_WARNING : null,
  };
}

function enqueueStorageOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation, operation);

  storageQueue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

async function writeRecords(
  records: readonly ParkingHistoryRecord[],
): Promise<void> {
  const canonical = canonicalizeRecords(records);

  if (
    canonical.rejectedRecordCount > 0 ||
    canonical.records.length !== records.length
  ) {
    throw new Error("Refusing to persist invalid parking history records.");
  }

  const envelope: ParkingHistoryStorageEnvelope = {
    version: PARKING_HISTORY_STORAGE_VERSION,
    records: canonical.records,
  };
  const serialized = JSON.stringify(envelope);
  const verification = decodeHistoryEnvelope(JSON.parse(serialized));

  if (
    verification.rejectedRecordCount > 0 ||
    verification.records.length !== canonical.records.length
  ) {
    throw new Error("Parking history could not be serialized safely.");
  }

  await storageAdapter.setItem(PARKING_HISTORY_STORAGE_KEY, serialized);
}

async function readRecords(): Promise<DecodedHistoryEnvelope> {
  const serialized = await storageAdapter.getItem(PARKING_HISTORY_STORAGE_KEY);

  if (serialized === null) {
    return {
      records: [],
      rejectedRecordCount: 0,
      needsRewrite: false,
      warning: null,
    };
  }

  try {
    return decodeHistoryEnvelope(JSON.parse(serialized));
  } catch (error) {
    if (error instanceof UnsupportedParkingHistoryVersionError) {
      throw error;
    }

    return {
      records: [],
      rejectedRecordCount: 1,
      needsRewrite: true,
      warning: INVALID_HISTORY_WARNING,
    };
  }
}

function mutationBlockReason(state: ParkingHistoryStoreState): string | null {
  if (!state.hasHydrated) {
    return HISTORY_NOT_READY_ERROR;
  }

  return state.isReadOnly ? HISTORY_READ_ONLY_ERROR : null;
}

export const useParkingHistoryStore = create<ParkingHistoryStoreState>()(
  (set, get) => ({
    records: [],
    hasHydrated: false,
    isHydrating: false,
    isReadOnly: false,
    hydrationError: null,
    operationError: null,

    hydrate: async () => {
      if (get().hasHydrated) {
        if (get().isReadOnly) {
          const error = get().hydrationError ?? HISTORY_READ_ONLY_ERROR;
          return { success: false, error };
        }

        return { success: true, rejectedRecordCount: 0 };
      }

      if (hydrationPromise) {
        return hydrationPromise;
      }

      set({ isHydrating: true, hydrationError: null });

      const pendingHydration = enqueueStorageOperation(async () => {
        let restoredHistory: DecodedHistoryEnvelope | null = null;

        try {
          restoredHistory = await readRecords();

          if (restoredHistory.needsRewrite) {
            await writeRecords(restoredHistory.records);
          }

          set({
            records: restoredHistory.records,
            hasHydrated: true,
            isHydrating: false,
            isReadOnly: false,
            hydrationError: restoredHistory.warning,
            operationError: null,
          });

          return {
            success: true as const,
            rejectedRecordCount: restoredHistory.rejectedRecordCount,
          };
        } catch (error) {
          const isFutureVersion =
            error instanceof UnsupportedParkingHistoryVersionError;
          const message = isFutureVersion
            ? "Parking history was created by a newer app version and is read-only in this version."
            : restoredHistory
              ? "Valid parking history was restored, but stored data could not be repaired safely. History is read-only."
              : "Parking history could not be loaded safely. Stored data was left unchanged.";

          set({
            records: restoredHistory?.records ?? [],
            hasHydrated: true,
            isHydrating: false,
            isReadOnly: true,
            hydrationError: message,
            operationError: null,
          });

          return { success: false as const, error: message };
        }
      });

      hydrationPromise = pendingHydration;

      try {
        return await pendingHydration;
      } finally {
        hydrationPromise = null;
      }
    },

    appendCompletedSession: (session) =>
      enqueueStorageOperation(async () => {
        if (!get().hasHydrated) {
          set({ operationError: HISTORY_NOT_READY_ERROR });
          return {
            success: false as const,
            error: HISTORY_NOT_READY_ERROR,
          };
        }

        const record = createParkingHistoryRecord({ session });

        if (!record) {
          const error =
            "Only a valid completed parking session can be added to history.";
          set({ operationError: error });
          return { success: false as const, error };
        }

        const existingRecord = get().records.find(
          (candidate) => candidate.sessionId === record.sessionId,
        );

        if (existingRecord) {
          set({ operationError: null });
          return {
            success: true as const,
            record: existingRecord,
            duplicate: true,
          };
        }

        if (get().isReadOnly) {
          set({ operationError: HISTORY_READ_ONLY_ERROR });
          return {
            success: false as const,
            error: HISTORY_READ_ONLY_ERROR,
          };
        }

        const records = sortParkingHistoryNewestFirst([
          ...get().records,
          record,
        ]);

        try {
          await writeRecords(records);
          set({ records, operationError: null });
          return { success: true as const, record, duplicate: false };
        } catch {
          set({ operationError: HISTORY_APPEND_WRITE_ERROR });
          return {
            success: false as const,
            error: HISTORY_APPEND_WRITE_ERROR,
          };
        }
      }),

    getRecordById: (id) => {
      const normalizedId = id.trim();
      return (
        get().records.find((record) => record.id === normalizedId) ?? null
      );
    },

    deleteRecord: (id) =>
      enqueueStorageOperation(async () => {
        const blockReason = mutationBlockReason(get());

        if (blockReason) {
          set({ operationError: blockReason });
          return { success: false as const, error: blockReason };
        }

        const normalizedId = id.trim();
        const records = get().records.filter(
          (record) => record.id !== normalizedId,
        );

        if (!normalizedId || records.length === get().records.length) {
          set({ operationError: null });
          return { success: true as const };
        }

        try {
          await writeRecords(records);
          set({ records, operationError: null });
          return { success: true as const };
        } catch {
          set({ operationError: HISTORY_MUTATION_WRITE_ERROR });
          return {
            success: false as const,
            error: HISTORY_MUTATION_WRITE_ERROR,
          };
        }
      }),

    clearHistory: () =>
      enqueueStorageOperation(async () => {
        const blockReason = mutationBlockReason(get());

        if (blockReason) {
          set({ operationError: blockReason });
          return { success: false as const, error: blockReason };
        }

        if (get().records.length === 0) {
          set({ operationError: null });
          return { success: true as const };
        }

        try {
          await writeRecords([]);
          set({ records: [], operationError: null });
          return { success: true as const };
        } catch {
          set({ operationError: HISTORY_MUTATION_WRITE_ERROR });
          return {
            success: false as const,
            error: HISTORY_MUTATION_WRITE_ERROR,
          };
        }
      }),

    clearOperationError: () => set({ operationError: null }),
  }),
);

/**
 * Redirects history persistence for deterministic development/testing only.
 * Call before `hydrate`; production uses AsyncStorage by default.
 */
export function setParkingHistoryStorageAdapterForTesting(
  adapter: ParkingHistoryStorageAdapter,
): void {
  storageAdapter = adapter;
}

export const selectParkingHistoryRecords = (
  state: ParkingHistoryStoreState,
): ParkingHistoryRecord[] => state.records;

export const selectParkingHistoryHasHydrated = (
  state: ParkingHistoryStoreState,
): boolean => state.hasHydrated;
