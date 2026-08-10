import { BITOLA_PARKING_OPERATOR } from "../data/bitolaParking";
import type { LocationCoordinates } from "../types/location";
import type { ParkingOperator } from "../types/parkingOperator";
import type {
  ParkingSession,
  ParkingSessionBase,
} from "../types/parkingSession";
import type { ParkingZone } from "../types/parkingZone";
import type { Vehicle } from "../types/vehicle";
import {
  buildStartParkingMessage,
  buildStopParkingMessage,
  formatStartParkingMessage,
  formatStopParkingMessage,
} from "./parkingSms";
import { validatePlateInput } from "./plate";
import { isUsableParkingZoneGeometry } from "./zoneDetection";
import { validateZoneCodeInput } from "./zoneCode";

export type ParkingSmsIneligibilityCode =
  | "explicit_user_action_required"
  | "operator_not_production"
  | "operator_mismatch"
  | "zone_operator_mismatch"
  | "zone_invalid"
  | "zone_inactive"
  | "zone_geography_not_verified"
  | "vehicle_invalid"
  | "protocol_invalid";

export interface ParkingSmsEligibilityInput {
  operator: ParkingOperator;
  zone: ParkingZone;
  vehicle: Vehicle;
  explicitUserAction: boolean;
}

export type ParkingSmsEligibilityResult =
  | {
      eligible: true;
      recipient: string;
      startMessage: string;
      stopMessage: string;
      normalizedZoneCode: string;
      normalizedPlate: string;
    }
  | {
      eligible: false;
      code: ParkingSmsIneligibilityCode;
      reason: string;
    };

const SMS_RECIPIENT_PATTERN = /^\+?[0-9]+$/;

function ineligible(
  code: ParkingSmsIneligibilityCode,
  reason: string,
): ParkingSmsEligibilityResult {
  return { eligible: false, code, reason };
}

function matchesConfiguredOperator(operator: ParkingOperator): boolean {
  return (
    operator.id === BITOLA_PARKING_OPERATOR.id &&
    operator.city === BITOLA_PARKING_OPERATOR.city &&
    operator.country === BITOLA_PARKING_OPERATOR.country
  );
}

function matchesConfiguredProtocol(operator: ParkingOperator): boolean {
  return (
    operator.sms.number === BITOLA_PARKING_OPERATOR.sms.number &&
    operator.sms.startTemplate ===
      BITOLA_PARKING_OPERATOR.sms.startTemplate &&
    operator.sms.stopMessage === BITOLA_PARKING_OPERATOR.sms.stopMessage
  );
}

/** Pure gate that must pass before any real SMS composer can be opened. */
export function checkParkingSmsEligibility(
  input: ParkingSmsEligibilityInput,
): ParkingSmsEligibilityResult {
  const { operator, zone, vehicle, explicitUserAction } = input;

  if (!explicitUserAction) {
    return ineligible(
      "explicit_user_action_required",
      "Parking SMS requires an explicit user action.",
    );
  }

  if (operator.environment !== "production") {
    return ineligible(
      "operator_not_production",
      "Real parking SMS is disabled for development operators.",
    );
  }

  if (!matchesConfiguredOperator(operator)) {
    return ineligible(
      "operator_mismatch",
      "The parking operator does not match the configured production operator.",
    );
  }

  if (
    !zone.id.trim() ||
    zone.operatorId !== operator.id ||
    zone.city !== operator.city
  ) {
    return ineligible(
      "zone_operator_mismatch",
      "The parking zone does not belong to the configured production operator.",
    );
  }

  if (!zone.active) {
    return ineligible(
      "zone_inactive",
      "The parking zone is not enabled for real SMS parking.",
    );
  }

  if (
    zone.geographyStatus !== "verified" ||
    !("geometry" in zone) ||
    !isUsableParkingZoneGeometry(zone.geometry)
  ) {
    return ineligible(
      "zone_geography_not_verified",
      "The parking zone geography has not been verified for real SMS parking.",
    );
  }

  const zoneValidation = validateZoneCodeInput(zone.code);

  if (!zoneValidation.isValid) {
    return ineligible(
      "zone_invalid",
      zoneValidation.error ?? "The parking zone code is invalid.",
    );
  }

  const plateValidation = validatePlateInput(vehicle.plate);

  if (!vehicle.id.trim() || !plateValidation.isValid) {
    return ineligible(
      "vehicle_invalid",
      plateValidation.error ?? "The selected vehicle is invalid.",
    );
  }

  if (
    !matchesConfiguredProtocol(operator) ||
    !SMS_RECIPIENT_PATTERN.test(operator.sms.number)
  ) {
    return ineligible(
      "protocol_invalid",
      "The production SMS protocol does not match the configured safe protocol.",
    );
  }

  try {
    return {
      eligible: true,
      recipient: operator.sms.number,
      startMessage: formatStartParkingMessage(
        operator.sms,
        zoneValidation.normalizedZoneCode,
        plateValidation.normalizedPlate,
      ),
      stopMessage: formatStopParkingMessage(operator.sms),
      normalizedZoneCode: zoneValidation.normalizedZoneCode,
      normalizedPlate: plateValidation.normalizedPlate,
    };
  } catch (error) {
    return ineligible(
      "protocol_invalid",
      error instanceof Error
        ? error.message
        : "The production SMS protocol is invalid.",
    );
  }
}

export type ParkingSessionDraftFailureCode =
  | ParkingSmsIneligibilityCode
  | "unsupported_zone_geography"
  | "invalid_session_id"
  | "invalid_time";

export interface CreateParkingSessionDraftInput {
  zone: ParkingZone;
  vehicle: Vehicle;
  startLocation: LocationCoordinates | null;
  explicitUserAction: boolean;
  now?: Date | string | number;
  sessionId?: string;
}

export type ParkingSessionDraftResult =
  | { success: true; session: ParkingSession }
  | {
      success: false;
      code: ParkingSessionDraftFailureCode;
      reason: string;
    };

function draftFailure(
  code: ParkingSessionDraftFailureCode,
  reason: string,
): ParkingSessionDraftResult {
  return { success: false, code, reason };
}

function resolveNow(value: Date | string | number | undefined): Date | null {
  const now = value === undefined ? new Date() : new Date(value);
  return Number.isNaN(now.getTime()) ? null : now;
}

function createSessionId(now: Date): string {
  return `parking-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function snapshotLocation(
  location: LocationCoordinates | null,
): LocationCoordinates | null {
  if (
    !location ||
    !Number.isFinite(location.latitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    !Number.isFinite(location.longitude) ||
    location.longitude < -180 ||
    location.longitude > 180 ||
    (location.accuracy !== null &&
      (!Number.isFinite(location.accuracy) || location.accuracy < 0))
  ) {
    return null;
  }

  return { ...location };
}

function buildSession(
  input: CreateParkingSessionDraftInput,
  sessionId: string,
  delivery:
    | {
        mode: "simulation";
        operatorId: string;
        smsNumber: null;
        zoneCode: string;
        plate: string;
        startMessage: string;
        stopMessage: string;
      }
    | {
        mode: "sms";
        operatorId: string;
        smsNumber: string;
        zoneCode: string;
        plate: string;
        startMessage: string;
        stopMessage: string;
      },
): ParkingSession {
  const startLocation = snapshotLocation(input.startLocation);
  const sessionBase: ParkingSessionBase = {
    id: sessionId,
    operatorId: delivery.operatorId,
    zoneId: input.zone.id.trim(),
    zoneCode: delivery.zoneCode,
    vehicleId: input.vehicle.id.trim(),
    plate: delivery.plate,
    startRequestPreparedAt: null,
    startRequestResult: null,
    startedAt: null,
    stopRequestPreparedAt: null,
    stopRequestResult: null,
    stoppedAt: null,
    status: "preparing",
    startLocation,
    lastKnownLocation: startLocation ? { ...startLocation } : null,
    startMessage: delivery.startMessage,
    stopMessage: delivery.stopMessage,
    estimatedCost: null,
    finalCost: null,
  };

  return delivery.mode === "simulation"
    ? { ...sessionBase, deliveryMode: "simulation", smsNumber: null }
    : {
        ...sessionBase,
        deliveryMode: "sms",
        smsNumber: delivery.smsNumber,
      };
}

/** Creates a side-effect-free, immutable-value session snapshot. */
export function createParkingSessionDraft(
  input: CreateParkingSessionDraftInput,
): ParkingSessionDraftResult {
  if (!input.explicitUserAction) {
    return draftFailure(
      "explicit_user_action_required",
      "Preparing a parking session requires an explicit user action.",
    );
  }

  if (!input.zone.id.trim()) {
    return draftFailure("zone_invalid", "The parking zone is invalid.");
  }

  if (!input.zone.active) {
    return draftFailure(
      "zone_inactive",
      "The parking zone is not enabled for parking sessions.",
    );
  }

  const zoneValidation = validateZoneCodeInput(input.zone.code);

  if (!zoneValidation.isValid) {
    return draftFailure(
      "zone_invalid",
      zoneValidation.error ?? "The parking zone code is invalid.",
    );
  }

  const plateValidation = validatePlateInput(input.vehicle.plate);

  if (!input.vehicle.id.trim() || !plateValidation.isValid) {
    return draftFailure(
      "vehicle_invalid",
      plateValidation.error ?? "The selected vehicle is invalid.",
    );
  }

  const now = resolveNow(input.now);

  if (!now) {
    return draftFailure("invalid_time", "The session time is invalid.");
  }

  if (input.sessionId !== undefined && !input.sessionId.trim()) {
    return draftFailure("invalid_session_id", "The session ID is invalid.");
  }

  const sessionId = input.sessionId?.trim() ?? createSessionId(now);

  if (input.zone.geographyStatus === "test") {
    try {
      return {
        success: true,
        session: buildSession(input, sessionId, {
          mode: "simulation",
          operatorId: input.zone.operatorId,
          smsNumber: null,
          zoneCode: zoneValidation.normalizedZoneCode,
          plate: plateValidation.normalizedPlate,
          startMessage: buildStartParkingMessage(
            zoneValidation.normalizedZoneCode,
            plateValidation.normalizedPlate,
          ),
          stopMessage: buildStopParkingMessage(),
        }),
      };
    } catch (error) {
      return draftFailure(
        "protocol_invalid",
        error instanceof Error
          ? error.message
          : "The parking SMS protocol is invalid.",
      );
    }
  }

  if (input.zone.geographyStatus === "unverified") {
    return draftFailure(
      "zone_geography_not_verified",
      "The parking zone is awaiting geography verification and cannot start a parking session.",
    );
  }

  const eligibility = checkParkingSmsEligibility({
    operator: BITOLA_PARKING_OPERATOR,
    zone: input.zone,
    vehicle: input.vehicle,
    explicitUserAction: input.explicitUserAction,
  });

  if (!eligibility.eligible) {
    return draftFailure(eligibility.code, eligibility.reason);
  }

  return {
    success: true,
    session: buildSession(input, sessionId, {
      mode: "sms",
      operatorId: BITOLA_PARKING_OPERATOR.id,
      smsNumber: eligibility.recipient,
      zoneCode: eligibility.normalizedZoneCode,
      plate: eligibility.normalizedPlate,
      startMessage: eligibility.startMessage,
      stopMessage: eligibility.stopMessage,
    }),
  };
}
