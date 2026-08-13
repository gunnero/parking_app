import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { publicDemoAwareStateStorage } from "../demo/publicDemoEnvironment";

export type AppLanguage = "en" | "mk";
export type LanguagePreference = "system" | AppLanguage;

export const LANGUAGE_PREFERENCE_STORAGE_KEY =
  "parkingapp-language-preference";

export interface LanguageStoreState {
  preference: LanguagePreference;
  hasHydrated: boolean;
  setPreference: (preference: LanguagePreference) => void;
}

type PersistedLanguageState = Pick<LanguageStoreState, "preference">;

export function isLanguagePreference(
  value: unknown,
): value is LanguagePreference {
  return value === "system" || value === "en" || value === "mk";
}

let markHydrationFinished: (() => void) | undefined;

export const useLanguageStore = create<LanguageStoreState>()(
  persist(
    (set) => {
      markHydrationFinished = () => set({ hasHydrated: true });

      return {
        preference: "system",
        hasHydrated: false,
        setPreference: (preference) => {
          set({
            preference: isLanguagePreference(preference)
              ? preference
              : "system",
          });
        },
      };
    },
    {
      name: LANGUAGE_PREFERENCE_STORAGE_KEY,
      storage: createJSONStorage(() =>
        publicDemoAwareStateStorage(AsyncStorage),
      ),
      partialize: (state): PersistedLanguageState => ({
        preference: state.preference,
      }),
      merge: (persistedState, currentState) => {
        const storedPreference = (
          persistedState as Partial<PersistedLanguageState> | undefined
        )?.preference;

        return {
          ...currentState,
          preference: isLanguagePreference(storedPreference)
            ? storedPreference
            : "system",
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          useLanguageStore.setState({
            preference: "system",
            hasHydrated: true,
          });
          return;
        }

        markHydrationFinished?.();
      },
    },
  ),
);
