export type ParkingDateTimeValue = Date | string | number;

const INVALID_FORMAT_VALUE = "—";

const MACEDONIAN_SHORT_MONTHS = [
  "јан.",
  "фев.",
  "мар.",
  "апр.",
  "мај",
  "јун.",
  "јул.",
  "авг.",
  "септ.",
  "окт.",
  "ноем.",
  "дек.",
] as const;

function isMacedonianLocale(locale?: string): boolean {
  return locale?.toLowerCase().startsWith("mk") === true;
}

function twoDigits(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Returns a finite timestamp without mutating Date inputs. */
export function getParkingTimestampMilliseconds(
  value: ParkingDateTimeValue,
): number | null {
  const milliseconds =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : Date.parse(value);

  return Number.isFinite(milliseconds) ? milliseconds : null;
}

/** Converts a supported date/time value to one canonical ISO timestamp. */
export function normalizeParkingTimestamp(
  value: ParkingDateTimeValue,
): string | null {
  const milliseconds = getParkingTimestampMilliseconds(value);
  return milliseconds === null ? null : new Date(milliseconds).toISOString();
}

/**
 * Derives whole elapsed seconds from lifecycle timestamps. Equal timestamps
 * produce a valid zero duration; reversed or malformed timestamps are invalid.
 */
export function deriveParkingDurationSeconds(
  startedAt: ParkingDateTimeValue,
  stoppedAt: ParkingDateTimeValue,
): number | null {
  const startedMilliseconds = getParkingTimestampMilliseconds(startedAt);
  const stoppedMilliseconds = getParkingTimestampMilliseconds(stoppedAt);

  if (
    startedMilliseconds === null ||
    stoppedMilliseconds === null ||
    stoppedMilliseconds < startedMilliseconds
  ) {
    return null;
  }

  return Math.floor((stoppedMilliseconds - startedMilliseconds) / 1_000);
}

function formatParkingDateTime(
  value: ParkingDateTimeValue,
  options: Intl.DateTimeFormatOptions,
  locale?: string,
): string {
  const milliseconds = getParkingTimestampMilliseconds(value);

  if (milliseconds === null) {
    return INVALID_FORMAT_VALUE;
  }

  try {
    return new Intl.DateTimeFormat(locale, options).format(
      new Date(milliseconds),
    );
  } catch {
    return INVALID_FORMAT_VALUE;
  }
}

/** Formats a parking date using the device locale and time zone. */
export function formatParkingDate(
  value: ParkingDateTimeValue,
  locale?: string,
): string {
  const milliseconds = getParkingTimestampMilliseconds(value);

  if (milliseconds === null) {
    return INVALID_FORMAT_VALUE;
  }

  if (isMacedonianLocale(locale)) {
    const date = new Date(milliseconds);
    return `${date.getDate()} ${MACEDONIAN_SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  return formatParkingDateTime(
    value,
    { day: "numeric", month: "short", year: "numeric" },
    locale,
  );
}

/** Formats a parking time using the device locale and time zone. */
export function formatParkingTime(
  value: ParkingDateTimeValue,
  locale?: string,
): string {
  const milliseconds = getParkingTimestampMilliseconds(value);

  if (milliseconds === null) {
    return INVALID_FORMAT_VALUE;
  }

  if (isMacedonianLocale(locale)) {
    const date = new Date(milliseconds);
    return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
  }

  return formatParkingDateTime(
    value,
    { hour: "2-digit", minute: "2-digit" },
    locale,
  );
}

/** Formats a duration compactly without introducing a date library. */
export function formatParkingDuration(
  durationSeconds: number,
  locale?: string,
): string {
  if (
    !Number.isFinite(durationSeconds) ||
    !Number.isInteger(durationSeconds) ||
    durationSeconds < 0
  ) {
    return INVALID_FORMAT_VALUE;
  }

  const isMacedonian = isMacedonianLocale(locale);

  if (durationSeconds === 0) {
    return isMacedonian ? "0 мин." : "0m";
  }

  if (durationSeconds < 60) {
    return isMacedonian ? "<1 мин." : "<1m";
  }

  const totalMinutes = Math.floor(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return isMacedonian ? `${minutes} мин.` : `${minutes}m`;
  }

  if (isMacedonian) {
    return minutes === 0
      ? `${hours} ч.`
      : `${hours} ч. ${minutes} мин.`;
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** Provides an expanded duration suitable for accessibility labels. */
export function formatParkingDurationAccessible(
  durationSeconds: number,
  locale?: string,
): string {
  if (
    !Number.isFinite(durationSeconds) ||
    !Number.isInteger(durationSeconds) ||
    durationSeconds < 0
  ) {
    return isMacedonianLocale(locale)
      ? "Времетраењето не е достапно"
      : "Duration unavailable";
  }

  const isMacedonian = isMacedonianLocale(locale);

  if (durationSeconds === 0) {
    return isMacedonian ? "0 минути" : "0 minutes";
  }

  if (durationSeconds < 60) {
    return isMacedonian ? "Помалку од 1 минута" : "Less than 1 minute";
  }

  const totalMinutes = Math.floor(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(
      isMacedonian
        ? `${hours} ${hours === 1 ? "час" : "часа"}`
        : `${hours} ${hours === 1 ? "hour" : "hours"}`,
    );
  }

  if (minutes > 0) {
    parts.push(
      isMacedonian
        ? `${minutes} ${minutes === 1 ? "минута" : "минути"}`
        : `${minutes} ${minutes === 1 ? "minute" : "minutes"}`,
    );
  }

  return parts.join(" ");
}
