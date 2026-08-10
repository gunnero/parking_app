export interface PlateValidationResult {
  isValid: boolean;
  normalizedPlate: string;
  error?: string;
}

const PLATE_PATTERN = /^[A-Z]{2}[0-9]{3,4}[A-Z]{2}$/;

/**
 * Produces the compact plate value stored by the app. Separators are display
 * concerns, so whitespace and hyphens are removed from persisted values.
 */
export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[\s-]+/g, "");
}

export function validatePlateInput(value: string): PlateValidationResult {
  const normalizedPlate = normalizePlate(value);

  if (normalizedPlate.length === 0) {
    return {
      isValid: false,
      normalizedPlate,
      error: "Plate is required.",
    };
  }

  if (!PLATE_PATTERN.test(normalizedPlate)) {
    return {
      isValid: false,
      normalizedPlate,
      error: "Use 2 letters, 3 or 4 digits, then 2 letters (for example BT7713AD).",
    };
  }

  return {
    isValid: true,
    normalizedPlate,
  };
}

export function validatePlate(value: string): boolean {
  return validatePlateInput(value).isValid;
}
