import type { LocationCoordinates } from "./location";
import type { ParkingMoney } from "./parkingTariff";

export type ParkingSessionStatus =
  | "preparing"
  | "awaiting_confirmation"
  | "active"
  | "stopping"
  | "awaiting_stop_confirmation"
  | "completed"
  | "failed";

export type ParkingSessionDeliveryMode = "simulation" | "sms";

/** A prepared request still requires explicit operator confirmation. */
export type ParkingSessionRequestResult = "simulated" | "sent" | "unknown";

export interface ParkingSessionOwnership {
  readonly driverUserId?: string;
  readonly requesterUserId?: string;
  readonly payerUserId?: string;
  readonly smsSenderUserId?: string;
}

export interface ParkingSessionBase {
  readonly id: string;
  readonly operatorId: string;
  readonly zoneId: string;
  readonly zoneCode: string;
  readonly zoneName?: string;
  readonly vehicleId: string;
  readonly plate: string;
  readonly vehicleNickname?: string;
  readonly ownership?: ParkingSessionOwnership;
  readonly startRequestPreparedAt: string | null;
  readonly startRequestResult: ParkingSessionRequestResult | null;
  readonly startedAt: string | null;
  readonly stopRequestPreparedAt: string | null;
  readonly stopRequestResult: ParkingSessionRequestResult | null;
  readonly stoppedAt: string | null;
  readonly status: ParkingSessionStatus;
  readonly startLocation: LocationCoordinates | null;
  readonly lastKnownLocation: LocationCoordinates | null;
  readonly startMessage: string;
  readonly stopMessage: string;
  readonly estimatedCost: ParkingMoney | null;
  readonly finalCost: ParkingMoney | null;
}

export type ParkingSession =
  | (ParkingSessionBase & {
      readonly deliveryMode: "simulation";
      readonly smsNumber: null;
    })
  | (ParkingSessionBase & {
      readonly deliveryMode: "sms";
      readonly smsNumber: string;
    });
