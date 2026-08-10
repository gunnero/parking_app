export interface ZoneCodeValidationResult {
  isValid: boolean;
  normalizedZoneCode: string;
  error?: string;
}

const MAX_ZONE_CODE_LENGTH = 16;
const ZONE_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/;

/** Normalizes a zone code without changing its internal structure. */
export function normalizeZoneCode(value: string): string {
  return value.trim().toUpperCase();
}

export function validateZoneCodeInput(value: string): ZoneCodeValidationResult {
  const normalizedZoneCode = normalizeZoneCode(value);

  if (normalizedZoneCode.length === 0) {
    return {
      isValid: false,
      normalizedZoneCode,
      error: "Parking zone code is required.",
    };
  }

  if (normalizedZoneCode.length > MAX_ZONE_CODE_LENGTH) {
    return {
      isValid: false,
      normalizedZoneCode,
      error: `Parking zone code must be ${MAX_ZONE_CODE_LENGTH} characters or fewer.`,
    };
  }

  if (!ZONE_CODE_PATTERN.test(normalizedZoneCode)) {
    return {
      isValid: false,
      normalizedZoneCode,
      error:
        "Parking zone code must start with a letter and contain only letters, numbers, and single hyphens.",
    };
  }

  return {
    isValid: true,
    normalizedZoneCode,
  };
}

export function validateZoneCode(value: string): boolean {
  return validateZoneCodeInput(value).isValid;
}
