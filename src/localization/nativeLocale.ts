import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";

export type NativeAppLanguage = "en" | "mk";

type NativeLanguagePreference = "system" | NativeAppLanguage;

// Keep this aligned with LANGUAGE_PREFERENCE_STORAGE_KEY in languageStore.ts.
// Importing the Zustand store here would start React-store hydration inside
// headless task processes, so native services read the persisted envelope
// directly instead.
const LANGUAGE_PREFERENCE_STORAGE_KEY =
  "parkingapp-language-preference";
const DEFAULT_NATIVE_APP_LANGUAGE: NativeAppLanguage = "mk";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNativeLanguagePreference(
  value: unknown,
): value is NativeLanguagePreference {
  return value === "system" || value === "en" || value === "mk";
}

function readPersistedPreference(
  serialized: string | null,
): NativeLanguagePreference | null {
  if (!serialized) {
    return null;
  }

  try {
    const envelope: unknown = JSON.parse(serialized);

    if (!isRecord(envelope) || !isRecord(envelope.state)) {
      return null;
    }

    const preference = envelope.state.preference;
    return isNativeLanguagePreference(preference) ? preference : null;
  } catch {
    return null;
  }
}

/** Resolves the supported language from the device without asynchronous I/O. */
export function getSystemNativeAppLanguage(): NativeAppLanguage {
  try {
    const primaryLocale = getLocales()[0];
    const languageCode = primaryLocale?.languageCode?.trim().toLowerCase();
    const languageTag = primaryLocale?.languageTag.trim().toLowerCase();
    const isMacedonian =
      languageCode === "mk" ||
      languageTag === "mk" ||
      languageTag?.startsWith("mk-") === true;

    return isMacedonian ? "mk" : "en";
  } catch {
    return "en";
  }
}

/**
 * Resolves the language selected in the app without relying on React or a
 * hydrated Zustand store. An explicit system preference follows the device;
 * missing, malformed, or unavailable storage uses the app's Macedonian
 * default.
 */
export async function getNativeAppLanguage(): Promise<NativeAppLanguage> {
  const systemLanguage = getSystemNativeAppLanguage();

  try {
    const serialized = await AsyncStorage.getItem(
      LANGUAGE_PREFERENCE_STORAGE_KEY,
    );
    const preference = readPersistedPreference(serialized);

    if (preference === "en" || preference === "mk") {
      return preference;
    }

    return preference === "system"
      ? systemLanguage
      : DEFAULT_NATIVE_APP_LANGUAGE;
  } catch {
    return DEFAULT_NATIVE_APP_LANGUAGE;
  }
}
