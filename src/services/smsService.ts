import * as SMS from "expo-sms";

export const SMS_COMPOSER_ACCEPTANCE_NOTICE =
  "The SMS composer result does not confirm that the parking operator accepted the request.";

interface SmsComposerOutcomeBase {
  /** Native composer feedback never proves operator acceptance. */
  operatorAcceptanceConfirmed: false;
}

export type SmsComposerOutcome =
  | (SmsComposerOutcomeBase & { outcome: "sent" })
  | (SmsComposerOutcomeBase & { outcome: "cancelled" })
  | (SmsComposerOutcomeBase & { outcome: "unknown" })
  | (SmsComposerOutcomeBase & {
      outcome: "unavailable";
      reason: string;
    })
  | (SmsComposerOutcomeBase & { outcome: "error"; reason: string });

export type SmsComposerFunction = (
  recipient: string,
  message: string,
) => Promise<SmsComposerOutcome>;

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "The SMS composer could not be opened.";
}

/**
 * Opens the native composer after checking device support. A `sent` result
 * reports only the native composer action; it is not parking acceptance. Call
 * this service only from a flow that has enforced an explicit-user-action gate.
 */
export const openSmsComposer: SmsComposerFunction = async (
  recipient,
  message,
) => {
  const normalizedRecipient = recipient.trim();
  const normalizedMessage = message.trim();

  if (!normalizedRecipient) {
    return {
      outcome: "error",
      operatorAcceptanceConfirmed: false,
      reason: "An SMS recipient is required.",
    };
  }

  if (!normalizedMessage) {
    return {
      outcome: "error",
      operatorAcceptanceConfirmed: false,
      reason: "An SMS message is required.",
    };
  }

  try {
    if (!(await SMS.isAvailableAsync())) {
      return {
        outcome: "unavailable",
        operatorAcceptanceConfirmed: false,
        reason: "SMS is not available on this device.",
      };
    }

    const response = await SMS.sendSMSAsync(
      normalizedRecipient,
      normalizedMessage,
    );

    switch (response.result) {
      case "sent":
        return { outcome: "sent", operatorAcceptanceConfirmed: false };
      case "cancelled":
        return { outcome: "cancelled", operatorAcceptanceConfirmed: false };
      case "unknown":
        return { outcome: "unknown", operatorAcceptanceConfirmed: false };
      default:
        return {
          outcome: "error",
          operatorAcceptanceConfirmed: false,
          reason: "The SMS composer returned an unsupported result.",
        };
    }
  } catch (error) {
    return {
      outcome: "error",
      operatorAcceptanceConfirmed: false,
      reason: errorMessage(error),
    };
  }
};
