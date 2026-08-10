import type { LocationCoordinates } from "./location";
import type { ParkingMoney } from "./parkingTariff";

export type ParkingSessionStatus =
  | "preparing"
  | "awaiting_confirmation"
  | "active"
  | "stopping"
  | "completed"
  | "failed";

export interface ParkingSession {
  id: string;
  operatorId: string;
  zoneId: string;
  zoneCode: string;
  vehicleId: string;
  plate: string;
  startedAt: string | null;
  stoppedAt: string | null;
  status: ParkingSessionStatus;
  startLocation: LocationCoordinates | null;
  lastKnownLocation: LocationCoordinates | null;
  smsNumber: string;
  startMessage: string;
  stopMessage: string;
  estimatedCost: ParkingMoney | null;
  finalCost: ParkingMoney | null;
}
