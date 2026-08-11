import type { LocationCoordinates } from "../types/location";
import type {
  CreateParkingHistoryRecordInput,
  ParkingHistoryCostSource,
  ParkingHistoryOwnershipSnapshot,
  ParkingHistoryRecord,
} from "../types/parkingHistory";
import type { ParkingMoney } from "../types/parkingTariff";
import {
  deriveParkingDurationSeconds,
  getParkingTimestampMilliseconds,
  normalizeParkingTimestamp,
} from "./dateTime";
import { restoreParkingSession } from "./parkingSessionState";
import { validatePlateInput } from "./plate";
import { validateZoneCodeInput } from "./zoneCode";

const PARKING_HISTORY_COST_SOURCES = new Set<ParkingHistoryCostSource>([
  "operator-confirmed",
  "user-entered",
  "estimated",
  "unknown",
]);

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F\u2028\u2029]/;
const MAX_RECORD_ID_LENGTH = 264;
const MAX_IDENTIFIER_LENGTH = 256;
const MAX_LABEL_LENGTH = 120;
const MAX_CURRENCY_LENGTH = 16;
const INVALID_VALUE = Symbol("invalid-value");

type InvalidValue = typeof INVALID_VALUE;
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(
  value: unknown,
  maximumLength: number = MAX_IDENTIFIER_LENGTH,
): string | InvalidValue {
  if (typeof value !== "string") {
    return INVALID_VALUE;
  }

  const normalized = value.trim();

  return normalized &&
    normalized.length <= maximumLength &&
    !CONTROL_CHARACTER_PATTERN.test(normalized)
    ? normalized
    : INVALID_VALUE;
}

function readOptionalNonEmptyString(
  value: unknown,
  maximumLength: number = MAX_IDENTIFIER_LENGTH,
): string | undefined | InvalidValue {
  if (value === undefined) {
    return undefined;
  }

  return readNonEmptyString(value, maximumLength);
}

function snapshotOptionalLabel(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const label = readNonEmptyString(value, MAX_LABEL_LENGTH);
  return label === INVALID_VALUE ? undefined : label;
}

function readTimestamp(value: unknown): string | InvalidValue {
  if (typeof value !== "string") {
    return INVALID_VALUE;
  }

  return normalizeParkingTimestamp(value) ?? INVALID_VALUE;
}

function readLocation(
  value: unknown,
): Readonly<LocationCoordinates> | undefined | InvalidValue {
  if (value === undefined) {
    return undefined;
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

  return Object.freeze({ latitude, longitude, accuracy });
}

function readMoney(
  value: unknown,
): Readonly<ParkingMoney> | null | InvalidValue {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    return INVALID_VALUE;
  }

  const currency = readNonEmptyString(value.currency, MAX_CURRENCY_LENGTH);

  if (
    currency === INVALID_VALUE ||
    typeof value.amount !== "number" ||
    !Number.isFinite(value.amount) ||
    value.amount < 0
  ) {
    return INVALID_VALUE;
  }

  return Object.freeze({
    amount: value.amount,
    currency: currency.toUpperCase(),
  });
}

function readOwnership(
  value: unknown,
): ParkingHistoryOwnershipSnapshot | undefined | InvalidValue {
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

    const userId = readNonEmptyString(value[key], MAX_IDENTIFIER_LENGTH);

    if (userId === INVALID_VALUE) {
      return INVALID_VALUE;
    }

    ownership[key] = userId;
  }

  return Object.freeze(ownership);
}

function isCostProvenanceValid(
  finalCost: Readonly<ParkingMoney> | null,
  costSource: ParkingHistoryCostSource,
): boolean {
  if (finalCost === null) {
    return costSource === "unknown" || costSource === "estimated";
  }

  return costSource !== "estimated";
}

function freezeParkingHistoryRecord(
  record: ParkingHistoryRecord,
): ParkingHistoryRecord {
  return Object.freeze({
    ...record,
    ...(record.ownership
      ? { ownership: Object.freeze({ ...record.ownership }) }
      : {}),
    ...(record.startLocation
      ? { startLocation: Object.freeze({ ...record.startLocation }) }
      : {}),
    finalCost: record.finalCost
      ? Object.freeze({ ...record.finalCost })
      : null,
  });
}

/** A stable ID makes repeated conversion of one session deterministic. */
export function createParkingHistoryRecordId(sessionId: string): string {
  return `history:${sessionId.trim()}`;
}

/**
 * Validates unknown persisted history data. Invalid snapshots return null and
 * can be discarded independently without crashing or rejecting other records.
 */
export function restoreParkingHistoryRecord(
  value: unknown,
): ParkingHistoryRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readNonEmptyString(value.id, MAX_RECORD_ID_LENGTH);
  const sessionId = readNonEmptyString(value.sessionId, MAX_IDENTIFIER_LENGTH);
  const operatorId = readNonEmptyString(
    value.operatorId,
    MAX_IDENTIFIER_LENGTH,
  );
  const zoneId = readOptionalNonEmptyString(
    value.zoneId,
    MAX_IDENTIFIER_LENGTH,
  );
  const zoneCode = readNonEmptyString(value.zoneCode, 16);
  const zoneName = readOptionalNonEmptyString(
    value.zoneName,
    MAX_LABEL_LENGTH,
  );
  const vehicleId = readOptionalNonEmptyString(
    value.vehicleId,
    MAX_IDENTIFIER_LENGTH,
  );
  const plate = readNonEmptyString(value.plate, 16);
  const vehicleNickname = readOptionalNonEmptyString(
    value.vehicleNickname,
    MAX_LABEL_LENGTH,
  );
  const ownership = readOwnership(value.ownership);
  const startedAt = readTimestamp(value.startedAt);
  const stoppedAt = readTimestamp(value.stoppedAt);
  const startLocation = readLocation(value.startLocation);
  const finalCost = readMoney(value.finalCost);
  const createdAt = readTimestamp(value.createdAt);

  if (
    id === INVALID_VALUE ||
    sessionId === INVALID_VALUE ||
    operatorId === INVALID_VALUE ||
    zoneId === INVALID_VALUE ||
    zoneCode === INVALID_VALUE ||
    zoneName === INVALID_VALUE ||
    vehicleId === INVALID_VALUE ||
    plate === INVALID_VALUE ||
    vehicleNickname === INVALID_VALUE ||
    ownership === INVALID_VALUE ||
    startedAt === INVALID_VALUE ||
    stoppedAt === INVALID_VALUE ||
    startLocation === INVALID_VALUE ||
    finalCost === INVALID_VALUE ||
    createdAt === INVALID_VALUE ||
    typeof value.durationSeconds !== "number" ||
    !Number.isInteger(value.durationSeconds) ||
    value.durationSeconds < 0 ||
    typeof value.costSource !== "string" ||
    !PARKING_HISTORY_COST_SOURCES.has(
      value.costSource as ParkingHistoryCostSource,
    ) ||
    typeof value.simulation !== "boolean"
  ) {
    return null;
  }

  const zoneValidation = validateZoneCodeInput(zoneCode);
  const plateValidation = validatePlateInput(plate);
  const durationSeconds = deriveParkingDurationSeconds(startedAt, stoppedAt);
  const costSource = value.costSource as ParkingHistoryCostSource;

  if (
    id !== createParkingHistoryRecordId(sessionId) ||
    !zoneValidation.isValid ||
    zoneValidation.normalizedZoneCode !== zoneCode ||
    !plateValidation.isValid ||
    plateValidation.normalizedPlate !== plate ||
    durationSeconds === null ||
    durationSeconds !== value.durationSeconds ||
    !isCostProvenanceValid(finalCost, costSource) ||
    getParkingTimestampMilliseconds(createdAt)!
      < getParkingTimestampMilliseconds(stoppedAt)!
  ) {
    return null;
  }

  return freezeParkingHistoryRecord({
    id,
    sessionId,
    operatorId,
    ...(zoneId ? { zoneId } : {}),
    zoneCode,
    ...(zoneName ? { zoneName } : {}),
    ...(vehicleId ? { vehicleId } : {}),
    plate,
    ...(vehicleNickname ? { vehicleNickname } : {}),
    ...(ownership ? { ownership } : {}),
    startedAt,
    stoppedAt,
    durationSeconds,
    ...(startLocation ? { startLocation } : {}),
    finalCost,
    costSource,
    simulation: value.simulation,
    createdAt,
  });
}

/**
 * Creates a self-contained history snapshot only from a valid completed
 * session. No current vehicle or zone store is consulted.
 */
export function createParkingHistoryRecord(
  input: CreateParkingHistoryRecordInput,
): ParkingHistoryRecord | null {
  const session = restoreParkingSession(input.session);

  if (
    !session ||
    session.status !== "completed" ||
    session.startedAt === null ||
    session.stoppedAt === null
  ) {
    return null;
  }

  const zoneNameValue =
    session.zoneName ?? input.session.zoneName ?? input.zoneName;
  const vehicleNicknameValue =
    session.vehicleNickname ??
    input.session.vehicleNickname ??
    input.vehicleNickname;
  // Optional display metadata must never prevent the durable core receipt.
  // Persisted records remain strict, while unusable source labels are omitted.
  const zoneName = snapshotOptionalLabel(zoneNameValue);
  const vehicleNickname = snapshotOptionalLabel(vehicleNicknameValue);

  const createdAt = normalizeParkingTimestamp(
    input.createdAt ?? session.stoppedAt,
  );

  if (!createdAt) {
    return null;
  }

  const rawRecord: ParkingHistoryRecord = {
    id: createParkingHistoryRecordId(session.id),
    sessionId: session.id,
    operatorId: session.operatorId,
    zoneId: session.zoneId,
    zoneCode: session.zoneCode,
    ...(zoneName ? { zoneName } : {}),
    vehicleId: session.vehicleId,
    plate: session.plate,
    ...(vehicleNickname ? { vehicleNickname } : {}),
    ...(session.ownership
      ? { ownership: Object.freeze({ ...session.ownership }) }
      : {}),
    startedAt: session.startedAt,
    stoppedAt: session.stoppedAt,
    durationSeconds:
      deriveParkingDurationSeconds(session.startedAt, session.stoppedAt) ?? -1,
    ...(session.startLocation
      ? { startLocation: Object.freeze({ ...session.startLocation }) }
      : {}),
    finalCost: session.finalCost
      ? Object.freeze({ ...session.finalCost })
      : null,
    // ParkingSession currently carries no final-cost provenance. Preserve a
    // value if one exists, but never promote it to a trusted final charge.
    costSource: "unknown",
    simulation: session.deliveryMode === "simulation",
    createdAt,
  };

  return restoreParkingHistoryRecord(rawRecord);
}

/** Returns a new array ordered by the completion timestamp, newest first. */
export function sortParkingHistoryNewestFirst(
  records: readonly ParkingHistoryRecord[],
): ParkingHistoryRecord[] {
  return [...records].sort((left, right) => {
    const stoppedDifference =
      (getParkingTimestampMilliseconds(right.stoppedAt) ?? 0) -
      (getParkingTimestampMilliseconds(left.stoppedAt) ?? 0);

    if (stoppedDifference !== 0) {
      return stoppedDifference;
    }

    const createdDifference =
      (getParkingTimestampMilliseconds(right.createdAt) ?? 0) -
      (getParkingTimestampMilliseconds(left.createdAt) ?? 0);

    return createdDifference !== 0
      ? createdDifference
      : right.id.localeCompare(left.id);
  });
}

/**
 * Only an operator-confirmed amount is safe to present as a final charge.
 * Unknown, estimated, and user-entered provenance remain hidden as final cost.
 */
export function getTrustedParkingHistoryFinalCost(
  record: Pick<ParkingHistoryRecord, "finalCost" | "costSource">,
): Readonly<ParkingMoney> | null {
  return record.costSource === "operator-confirmed" ? record.finalCost : null;
}

export function hasTrustedParkingHistoryFinalCost(
  record: Pick<ParkingHistoryRecord, "finalCost" | "costSource">,
): boolean {
  return getTrustedParkingHistoryFinalCost(record) !== null;
}
