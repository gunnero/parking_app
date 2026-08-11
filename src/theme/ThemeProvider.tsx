import * as SystemUI from "expo-system-ui";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { Appearance, useColorScheme } from "react-native";

import { useThemeStore } from "../stores/themeStore";
import { theme } from "./tokens";
import type { AppTheme, ThemeMode, ThemePreference } from "./types";

export interface AppThemeContextValue {
  theme: AppTheme;
  preference: ThemePreference;
  mode: ThemeMode;
  systemMode: ThemeMode;
  hasHydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function normalizeColorScheme(value: string | null | undefined): ThemeMode {
  return value === "dark" ? "dark" : "light";
}

function applyAppearancePreference(preference: ThemePreference): void {
  try {
    Appearance.setColorScheme(
      preference === "system" ? "unspecified" : preference,
    );
  } catch {
    // Older or unsupported native runtimes can still use the React theme.
  }
}

function applyRootBackground(color: string): void {
  try {
    void SystemUI.setBackgroundColorAsync(color).catch(() => undefined);
  } catch {
    // Root background synchronization is visual polish, never app-critical.
  }
}

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const hasHydrated = useThemeStore((state) => state.hasHydrated);
  const setPreference = useThemeStore((state) => state.setPreference);
  const systemMode = normalizeColorScheme(systemColorScheme);
  const mode = preference === "system" ? systemMode : preference;
  const activeTheme = theme[mode];

  useEffect(() => {
    applyAppearancePreference(preference);
  }, [preference]);

  useEffect(() => {
    applyRootBackground(activeTheme.colors.background);
  }, [activeTheme]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      theme: activeTheme,
      preference,
      mode,
      systemMode,
      hasHydrated,
      setPreference,
    }),
    [activeTheme, hasHydrated, mode, preference, setPreference, systemMode],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeContextValue {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider.");
  }

  return context;
}
