import type {
  ParkingSourceMetadata,
  ParkingSourceVerificationStatus,
} from "./parkingSource";

export type ParkingTariffVerificationStatus =
  ParkingSourceVerificationStatus;

export interface ParkingMoney {
  amount: number;
  currency: string;
}

interface ParkingTariffBase {
  source: ParkingSourceMetadata;
  label?: string;
  notes?: string;
}

export interface HourlyParkingTariff extends ParkingTariffBase {
  type: "hourly";
  amount: number;
  currency: string;
}

export interface DailyParkingTariff extends ParkingTariffBase {
  type: "daily";
  amount: number;
  currency: string;
}

/**
 * A tier's upper bound is cumulative. Omit `upToMinutes` only for the final,
 * open-ended tier. Without `billingPeriodMinutes`, `amount` is the fixed charge
 * for that tier; with it, `amount` is charged once per billing interval.
 */
export interface ParkingTariffTier {
  upToMinutes?: number;
  amount: number;
  billingPeriodMinutes?: number;
  label?: string;
}

export interface TieredParkingTariff extends ParkingTariffBase {
  type: "tiered";
  currency: string;
  tiers: readonly ParkingTariffTier[];
}

export interface UnknownParkingTariff extends ParkingTariffBase {
  type: "unknown";
}

export type ParkingTariff =
  | HourlyParkingTariff
  | DailyParkingTariff
  | TieredParkingTariff
  | UnknownParkingTariff;
