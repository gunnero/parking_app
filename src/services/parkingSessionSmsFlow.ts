import {
  BITOLA_PARKING_OPERATOR,
  BITOLA_PARKING_ZONES,
} from "../data/bitolaParking";
import type { ParkingSession } from "../types/parkingSession";
import {
  buildStartParkingMessage,
  buildStopParkingMessage,
} from "../utils/parkingSms";
import { checkParkingSmsEligibility } from "../utils/parkingSmsEligibility";
import { validatePlateInput } from "../utils/plate";
import { validateZoneCodeInput } from "../utils/zoneCode";
import {
  openSmsComposer,
  type SmsComposerFunction,
  type SmsComposerOutcome,
} from "./smsService";

const SNAPSHOT_SMS_RECIPIENT_PATTERN = /^\+?[0-9]+$/;
const SNAPSHOT_CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F\u2028\u2029]/;
const inFlightComposerRequests = new Set<string>();

export type ParkingSessionSmsFlowResult =
  | {
      outcome: "simulated";
      requestResult: "simulated";
      operatorAcceptanceConfirmed: false;
    }
  | {
      outcome: "sent";
      requestResult: "sent";
      operatorAcceptanceConfirmed: false;
      composerOutcome: Extract<SmsComposerOutcome, { outcome: "sent" }>;
    }
  | {
      outcome: "unknown";
      requestResult: "unknown";
      operatorAcceptanceConfirmed: false;
      composerOutcome: Extract<SmsComposerOutcome, { outcome: "unknown" }>;
    }
  | {
      outcome: "cancelled";
      requestResult: null;
      operatorAcceptanceConfirmed: false;
      composerOutcome: Extract<SmsComposerOutcome, { outcome: "cancelled" }>;
    }
  | {
      outcome: "unavailable" | "error";
      requestResult: null;
      operatorAcceptanceConfirmed: false;
      reason: string;
      composerOutcome?: SmsComposerOutcome;
    }
  | {
      outcome: "blocked";
      requestResult: null;
      operatorAcceptanceConfirmed: false;
      reason: string;
    };

function validateSessionSnapshot(
  session: ParkingSession,
  action: "start" | "stop",
): string | null {
  if (
    session.deliveryMode !== "simulation" &&
    session.deliveryMode !== "sms"
  ) {
    return "The parking session delivery mode is invalid.";
  }

  if (!session.id.trim() || !session.zoneId.trim() || !session.vehicleId.trim()) {
    return "The parking session snapshot is incomplete.";
  }

  if (session.deliveryMode === "simulation") {
    return session.smsNumber === null
      ? null
      : "Simulated parking sessions must not have an SMS recipient.";
  }

  if (session.operatorId !== BITOLA_PARKING_OPERATOR.id) {
    return "The parking session does not match the configured production operator.";
  }

  if (action === "stop") {
    if (
      !session.smsNumber ||
      session.smsNumber !== session.smsNumber.trim() ||
      !SNAPSHOT_SMS_RECIPIENT_PATTERN.test(session.smsNumber) ||
      !session.stopMessage.trim() ||
      session.stopMessage !== session.stopMessage.trim() ||
      SNAPSHOT_CONTROL_CHARACTER_PATTERN.test(session.stopMessage)
    ) {
      return "The persisted stop SMS snapshot is invalid.";
    }

    if (
      session.smsNumber !== BITOLA_PARKING_OPERATOR.sms.number ||
      session.stopMessage !== BITOLA_PARKING_OPERATOR.sms.stopMessage
    ) {
      return "The persisted stop SMS snapshot does not match the configured protocol.";
    }

    return null;
  }

  const zoneValidation = validateZoneCodeInput(session.zoneCode);
  const plateValidation = validatePlateInput(session.plate);

  if (!zoneValidation.isValid || !plateValidation.isValid) {
    return "The parking session contains an invalid zone or vehicle snapshot.";
  }

  const expectedStartMessage = buildStartParkingMessage(
    zoneValidation.normalizedZoneCode,
    plateValidation.normalizedPlate,
  );
  const expectedStopMessage = buildStopParkingMessage();

  if (
    session.smsNumber !== BITOLA_PARKING_OPERATOR.sms.number ||
    session.zoneCode !== zoneValidation.normalizedZoneCode ||
    session.plate !== plateValidation.normalizedPlate ||
    session.startMessage !== expectedStartMessage ||
    session.stopMessage !== expectedStopMessage
  ) {
    return "The parking session SMS snapshot no longer matches the configured protocol.";
  }

  return null;
}

function blocked(reason: string): ParkingSessionSmsFlowResult {
  return {
    outcome: "blocked",
    requestResult: null,
    operatorAcceptanceConfirmed: false,
    reason,
  };
}

function revalidateProductionStart(session: ParkingSession): string | null {
  if (session.deliveryMode !== "sms") {
    return "Only production SMS sessions can use the real start composer.";
  }

  const zone = BITOLA_PARKING_ZONES.find(
    (candidate) =>
      candidate.id === session.zoneId && candidate.code === session.zoneCode,
  );

  if (!zone) {
    return "The parking zone is not in the configured production catalogue.";
  }

  const eligibility = checkParkingSmsEligibility({
    operator: BITOLA_PARKING_OPERATOR,
    zone,
    vehicle: {
      id: session.vehicleId,
      plate: session.plate,
      isDefault: false,
    },
    explicitUserAction: true,
  });

  if (!eligibility.eligible) {
    return eligibility.reason;
  }

  if (
    session.smsNumber !== eligibility.recipient ||
    session.zoneCode !== eligibility.normalizedZoneCode ||
    session.plate !== eligibility.normalizedPlate ||
    session.startMessage !== eligibility.startMessage ||
    session.stopMessage !== eligibility.stopMessage
  ) {
    return "The parking session no longer matches the eligible production SMS request.";
  }

  return null;
}

async function runComposer(
  recipient: string,
  message: string,
  composer: SmsComposerFunction,
): Promise<ParkingSessionSmsFlowResult> {
  let composerOutcome: SmsComposerOutcome;

  try {
    composerOutcome = await composer(recipient, message);
  } catch (error) {
    return {
      outcome: "error",
      requestResult: null,
      operatorAcceptanceConfirmed: false,
      reason:
        error instanceof Error
          ? error.message
          : "The SMS composer could not be opened.",
    };
  }

  switch (composerOutcome.outcome) {
    case "sent":
      return {
        outcome: "sent",
        requestResult: "sent",
        operatorAcceptanceConfirmed: false,
        composerOutcome,
      };
    case "unknown":
      return {
        outcome: "unknown",
        requestResult: "unknown",
        operatorAcceptanceConfirmed: false,
        composerOutcome,
      };
    case "cancelled":
      return {
        outcome: "cancelled",
        requestResult: null,
        operatorAcceptanceConfirmed: false,
        composerOutcome,
      };
    case "unavailable":
    case "error":
      return {
        outcome: composerOutcome.outcome,
        requestResult: null,
        operatorAcceptanceConfirmed: false,
        reason: composerOutcome.reason,
        composerOutcome,
      };
  }
}

async function runParkingSmsFlow(
  session: ParkingSession,
  action: "start" | "stop",
  explicitUserAction: boolean,
  composer: SmsComposerFunction,
): Promise<ParkingSessionSmsFlowResult> {
  if (!explicitUserAction) {
    return blocked(
      `The ${action} SMS composer requires an explicit user action.`,
    );
  }

  const requiredStatus = action === "start" ? "preparing" : "stopping";

  if (session.status !== requiredStatus) {
    return blocked(
      `The ${action} request cannot be prepared from session status ${session.status}.`,
    );
  }

  const snapshotError = validateSessionSnapshot(session, action);

  if (snapshotError) {
    return blocked(snapshotError);
  }

  if (session.deliveryMode === "simulation") {
    return {
      outcome: "simulated",
      requestResult: "simulated",
      operatorAcceptanceConfirmed: false,
    };
  }

  if (action === "start") {
    const eligibilityError = revalidateProductionStart(session);

    if (eligibilityError) {
      return blocked(eligibilityError);
    }
  }

  if (!session.smsNumber) {
    return blocked("The production SMS recipient is missing.");
  }

  const requestKey = `${action}:${session.id}`;

  if (inFlightComposerRequests.has(requestKey)) {
    return blocked(`The ${action} SMS composer is already open.`);
  }

  inFlightComposerRequests.add(requestKey);

  try {
    return await runComposer(
      session.smsNumber,
      action === "start" ? session.startMessage : session.stopMessage,
      composer,
    );
  } finally {
    inFlightComposerRequests.delete(requestKey);
  }
}

export function runStartParkingSmsFlow(
  session: ParkingSession,
  explicitUserAction: boolean,
  composer: SmsComposerFunction = openSmsComposer,
): Promise<ParkingSessionSmsFlowResult> {
  return runParkingSmsFlow(session, "start", explicitUserAction, composer);
}

/** Stop flow intentionally has no location or GPS dependency. */
export function runStopParkingSmsFlow(
  session: ParkingSession,
  explicitUserAction: boolean,
  composer: SmsComposerFunction = openSmsComposer,
): Promise<ParkingSessionSmsFlowResult> {
  return runParkingSmsFlow(session, "stop", explicitUserAction, composer);
}
