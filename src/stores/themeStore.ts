import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ThemePreference } from "../theme/types";

export const THEME_PREFERENCE_STORAGE_KEY = "parkingapp-theme-preference";

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
        preference: "system",
        hasHydrated: false,
        setPreference: (preference) => {
          set({ preference: isThemePreference(preference) ? preference : "system" });
        },
      };
    },
    {
      name: THEME_PREFERENCE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
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
            : "system",
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          useThemeStore.setState({ preference: "system", hasHydrated: true });
          return;
        }

        markHydrationFinished?.();
      },
    },
  ),
);
