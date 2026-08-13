import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { publicDemoAwareStateStorage } from "../demo/publicDemoEnvironment";
import type { ThemePreference } from "../theme/types";

export const THEME_PREFERENCE_STORAGE_KEY = "parkingapp-theme-preference";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "light";

export interface ThemeStoreState {
  preference: ThemePreference;
  hasHydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
}

type PersistedThemeState = Pick<ThemeStoreState, "preference">;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

let markHydrationFinished: (() => void) | undefined;

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set) => {
      markHydrationFinished = () => set({ hasHydrated: true });

      return {
        preference: DEFAULT_THEME_PREFERENCE,
        hasHydrated: false,
        setPreference: (preference) => {
          set({
            preference: isThemePreference(preference)
              ? preference
              : DEFAULT_THEME_PREFERENCE,
          });
        },
      };
    },
    {
      name: THEME_PREFERENCE_STORAGE_KEY,
      storage: createJSONStorage(() =>
        publicDemoAwareStateStorage(AsyncStorage),
      ),
      partialize: (state): PersistedThemeState => ({
        preference: state.preference,
      }),
      merge: (persistedState, currentState) => {
        const storedPreference = (
          persistedState as Partial<PersistedThemeState> | undefined
        )?.preference;

        return {
          ...currentState,
          preference: isThemePreference(storedPreference)
            ? storedPreference
            : DEFAULT_THEME_PREFERENCE,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          useThemeStore.setState({
            preference: DEFAULT_THEME_PREFERENCE,
            hasHydrated: true,
          });
          return;
        }

        markHydrationFinished?.();
      },
    },
  ),
);
