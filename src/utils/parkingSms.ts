import { BITOLA_PARKING_SMS_PROTOCOL } from "../data/bitolaParking";
import type { ParkingSmsProtocol } from "../types/parkingOperator";
import { validatePlateInput } from "./plate";
import { validateZoneCodeInput } from "./zoneCode";

export type ParkingSmsTemplateValues = Readonly<Record<string, string>>;

const TEMPLATE_TOKEN_PATTERN = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;
const SMS_CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F\u2028\u2029]/;

function assertSingleLineSmsText(value: string, label: string): void {
  if (SMS_CONTROL_CHARACTER_PATTERN.test(value)) {
    throw new Error(`${label} must not contain control characters.`);
  }
}

/**
 * Substitutes named values in an SMS template and rejects missing or empty
 * values. The formatter has no device or SMS-composer side effects.
 */
export function formatParkingSmsTemplate(
  template: string,
  values: ParkingSmsTemplateValues,
): string {
  assertSingleLineSmsText(template, "Parking SMS template");

  const normalizedTemplate = template.trim();

  if (!normalizedTemplate) {
    throw new Error("Parking SMS template is required.");
  }

  const templateWithoutTokens = normalizedTemplate.replace(
    TEMPLATE_TOKEN_PATTERN,
    "",
  );

  if (/[{}]/.test(templateWithoutTokens)) {
    throw new Error("Parking SMS template contains a malformed token.");
  }

  return normalizedTemplate.replace(
    TEMPLATE_TOKEN_PATTERN,
    (placeholder, token: string) => {
      const value = values[token];

      if (value === undefined) {
        throw new Error(`Missing value for parking SMS token ${placeholder}.`);
      }

      if (!value.trim()) {
        throw new Error(`Parking SMS token ${placeholder} cannot be empty.`);
      }

      assertSingleLineSmsText(value, `Parking SMS token ${placeholder}`);

      return value;
    },
  );
}

export function formatStartParkingMessage(
  protocol: ParkingSmsProtocol,
  zone: string,
  plate: string,
): string {
  const templateTokens = Array.from(
    protocol.startTemplate.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g),
    (match) => match[1],
  );

  if (
    templateTokens.filter((token) => token === "zone").length !== 1 ||
    templateTokens.filter((token) => token === "plate").length !== 1
  ) {
    throw new Error(
      "Parking start template must contain one {zone} token and one {plate} token.",
    );
  }

  const zoneValidation = validateZoneCodeInput(zone);

  if (!zoneValidation.isValid) {
    throw new Error(zoneValidation.error ?? "Parking zone code is invalid.");
  }

  const plateValidation = validatePlateInput(plate);

  if (!plateValidation.isValid) {
    throw new Error(plateValidation.error ?? "Vehicle plate is invalid.");
  }

  return formatParkingSmsTemplate(protocol.startTemplate, {
    zone: zoneValidation.normalizedZoneCode,
    plate: plateValidation.normalizedPlate,
  });
}

export function formatStopParkingMessage(
  protocol: ParkingSmsProtocol,
): string {
  assertSingleLineSmsText(protocol.stopMessage, "Parking stop message");

  const stopMessage = protocol.stopMessage.trim();

  if (!stopMessage) {
    throw new Error("Parking stop message is required.");
  }

  return stopMessage;
}

export function buildStartParkingMessage(zone: string, plate: string): string {
  return formatStartParkingMessage(BITOLA_PARKING_SMS_PROTOCOL, zone, plate);
}

export function buildStopParkingMessage(): string {
  return formatStopParkingMessage(BITOLA_PARKING_SMS_PROTOCOL);
}
