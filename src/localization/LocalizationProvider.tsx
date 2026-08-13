import { getLocales } from "expo-localization";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

import {
  type AppLanguage,
  type LanguagePreference,
  useLanguageStore,
} from "../stores/languageStore";
import {
  translate,
  translateKnownMessage,
  type TranslationParams,
} from "./translations";

export type TranslationFunction = (
  source: string,
  params?: TranslationParams,
) => string;

export interface TranslateMessageFunction {
  (message: string): string;
  (message: null): null;
  (message: undefined): undefined;
  (message: string | null | undefined): string | null | undefined;
}

export interface LocalizationContextValue {
  language: AppLanguage;
  locale: string;
  preference: LanguagePreference;
  systemLanguage: AppLanguage;
  hasHydrated: boolean;
  setPreference: (preference: LanguagePreference) => void;
  t: TranslationFunction;
  translateMessage: TranslateMessageFunction;
}

type SupportedDeviceLocale = {
  language: AppLanguage;
  locale: string;
};

type DeviceLocalization = {
  system: SupportedDeviceLocale;
  localeByLanguage: Record<AppLanguage, string>;
};

const DEFAULT_LOCALES: Record<AppLanguage, string> = {
  en: "en-GB",
  mk: "mk-MK",
};

const LocalizationContext = createContext<LocalizationContextValue | null>(
  null,
);

function appLanguageFromCode(
  languageCode: string | null | undefined,
  languageTag: string,
): AppLanguage | null {
  const normalizedCode = languageCode?.trim().toLowerCase();
  const normalizedTag = languageTag.trim().toLowerCase();

  if (normalizedCode === "mk" || normalizedTag === "mk") {
    return "mk";
  }

  if (normalizedCode === "en" || normalizedTag === "en") {
    return "en";
  }

  if (normalizedTag.startsWith("mk-")) {
    return "mk";
  }

  if (normalizedTag.startsWith("en-")) {
    return "en";
  }

  return null;
}

function readDeviceLocalization(): DeviceLocalization {
  try {
    const locales = getLocales();
    const supportedLocales: SupportedDeviceLocale[] = [];

    for (const deviceLocale of locales) {
      const language = appLanguageFromCode(
        deviceLocale.languageCode,
        deviceLocale.languageTag,
      );

      if (!language) {
        continue;
      }

      supportedLocales.push({
        language,
        locale: deviceLocale.languageTag || DEFAULT_LOCALES[language],
      });
    }

    const system = supportedLocales[0] ?? {
      language: "en" as const,
      locale: DEFAULT_LOCALES.en,
    };
    const englishLocale = supportedLocales.find(
      (candidate) => candidate.language === "en",
    )?.locale;
    const macedonianLocale = supportedLocales.find(
      (candidate) => candidate.language === "mk",
    )?.locale;

    return {
      system,
      localeByLanguage: {
        en: englishLocale ?? DEFAULT_LOCALES.en,
        mk: macedonianLocale ?? DEFAULT_LOCALES.mk,
      },
    };
  } catch {
    return {
      system: {
        language: "en",
        locale: DEFAULT_LOCALES.en,
      },
      localeByLanguage: DEFAULT_LOCALES,
    };
  }
}

export interface LocalizationProviderProps {
  children: ReactNode;
}

export function LocalizationProvider({ children }: LocalizationProviderProps) {
  const preference = useLanguageStore((state) => state.preference);
  const hasHydrated = useLanguageStore((state) => state.hasHydrated);
  const setPreference = useLanguageStore((state) => state.setPreference);
  const [deviceLocalization, setDeviceLocalization] =
    useState<DeviceLocalization>(readDeviceLocalization);
  const language =
    preference === "system" ? deviceLocalization.system.language : preference;
  const locale =
    preference === "system"
      ? deviceLocalization.system.locale
      : deviceLocalization.localeByLanguage[preference];

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        setDeviceLocalization(readDeviceLocalization());
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    document.documentElement.lang = language;
    document.title =
      language === "mk" ? "Паркинг Битола" : "Parking Bitola";
  }, [language]);

  const t = useCallback<TranslationFunction>(
    (source, params) => translate(language, source, params),
    [language],
  );

  const translateMessage = useCallback(
    ((message: string | null | undefined) => {
      if (message === null || message === undefined) {
        return message;
      }

      return translateKnownMessage(language, message);
    }) as TranslateMessageFunction,
    [language],
  );

  const value = useMemo<LocalizationContextValue>(
    () => ({
      language,
      locale,
      preference,
      systemLanguage: deviceLocalization.system.language,
      hasHydrated,
      setPreference,
      t,
      translateMessage,
    }),
    [
      deviceLocalization.system.language,
      hasHydrated,
      language,
      locale,
      preference,
      setPreference,
      t,
      translateMessage,
    ],
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): LocalizationContextValue {
  const context = useContext(LocalizationContext);

  if (!context) {
    throw new Error(
      "useLocalization must be used within LocalizationProvider.",
    );
  }

  return context;
}
