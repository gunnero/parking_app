import type { LocationCoordinates } from "./location";
import type {
  ParkingSession,
  ParkingSessionOwnership,
} from "./parkingSession";
import type { ParkingMoney } from "./parkingTariff";

/** Describes where a captured parking cost came from. */
export type ParkingHistoryCostSource =
  | "operator-confirmed"
  | "user-entered"
  | "estimated"
  | "unknown";

export type ParkingHistoryOwnershipSnapshot =
  Readonly<ParkingSessionOwnership>;

/**
 * An immutable, self-contained receipt for one completed parking session.
 * Display values are snapshots and must not be resolved from current stores.
 */
export interface ParkingHistoryRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly operatorId: string;
  readonly zoneId?: string;
  readonly zoneCode: string;
  readonly zoneName?: string;
  readonly vehicleId?: string;
  readonly plate: string;
  readonly vehicleNickname?: string;
  readonly ownership?: ParkingHistoryOwnershipSnapshot;
  readonly startedAt: string;
  readonly stoppedAt: string;
  readonly durationSeconds: number;
  readonly startLocation?: Readonly<LocationCoordinates>;
  readonly finalCost: Readonly<ParkingMoney> | null;
  readonly costSource: ParkingHistoryCostSource;
  readonly simulation: boolean;
  readonly createdAt: string;
}

/**
 * Session snapshots are authoritative. The optional labels support legacy
 * completed sessions created before those labels were captured on-session.
 */
export interface CreateParkingHistoryRecordInput {
  readonly session: ParkingSession;
  readonly zoneName?: string | null;
  readonly vehicleNickname?: string | null;
  readonly createdAt?: Date | string | number;
}
