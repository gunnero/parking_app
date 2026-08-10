import type {
  ParkingOperator,
  ParkingSmsProtocol,
} from "../types/parkingOperator";
import type { UnknownParkingTariff } from "../types/parkingTariff";
import type {
  ParkingSourceMetadata,
  ParkingZone,
} from "../types/parkingZone";

export const BITOLA_PARKING_OPERATOR_ID = "bitola-parking";
export const BITOLA_PARKING_SMS_NUMBER = "144414";

export const BITOLA_PARKING_SMS_PROTOCOL: ParkingSmsProtocol = {
  number: BITOLA_PARKING_SMS_NUMBER,
  startTemplate: "{zone} {plate}",
  stopMessage: "S",
};

export const BITOLA_PARKING_OPERATOR: ParkingOperator = {
  id: BITOLA_PARKING_OPERATOR_ID,
  city: "Bitola",
  country: "MK",
  environment: "production",
  sms: BITOLA_PARKING_SMS_PROTOCOL,
};

/**
 * Referenced zone codes only. This list is unverified, non-authoritative, and
 * may be incomplete. Official confirmation from ЈП Паркинзи Битола is pending.
 */
export const BITOLA_UNVERIFIED_ZONE_CODES = [
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "A6",
  "A7",
  "A8",
  "A9",
  "A10",
  "A11",
  "A12",
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "B7",
  "B8",
  "C1",
  "C2",
  "C3",
  "C4",
  "D1",
  "H1",
] as const;

export const BITOLA_UNVERIFIED_ZONE_SOURCE: ParkingSourceMetadata = {
  name: "PARK-002A supplied Bitola zone-code reference list",
  verificationStatus: "unverified",
  notes:
    "The supplied references are not authoritative or complete. Official zone definitions are awaiting confirmation from ЈП Паркинзи Битола.",
};

export const BITOLA_UNKNOWN_TARIFF_SOURCE: ParkingSourceMetadata = {
  name: "No verified Bitola tariff source supplied",
  verificationStatus: "unverified",
  notes:
    "Official tariff information is awaiting confirmation from ЈП Паркинзи Битола.",
};

export const BITOLA_UNKNOWN_TARIFF: UnknownParkingTariff = {
  type: "unknown",
  source: BITOLA_UNKNOWN_TARIFF_SOURCE,
  notes:
    "No tariff is configured while official Bitola tariff information is awaiting verification.",
};

/**
 * Production-facing catalogue placeholders. Every record is disabled within
 * this app pending verification; `active: false` does not claim that a zone is
 * closed in the real world. No record has geometry, a schedule, or a claimed
 * tariff until verified official data is available.
 */
export const BITOLA_PARKING_ZONES: readonly ParkingZone[] =
  BITOLA_UNVERIFIED_ZONE_CODES.map(
    (code): ParkingZone => ({
      id: `bitola-${code.toLowerCase()}`,
      city: BITOLA_PARKING_OPERATOR.city,
      code,
      name: `Bitola zone ${code} (unverified)`,
      description:
        "Referenced parking zone awaiting official confirmation, geography, tariff, and operating schedule.",
      operatorId: BITOLA_PARKING_OPERATOR.id,
      active: false,
      geographyStatus: "unverified",
      tariff: { ...BITOLA_UNKNOWN_TARIFF },
      source: { ...BITOLA_UNVERIFIED_ZONE_SOURCE },
    }),
  );
