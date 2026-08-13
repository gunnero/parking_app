import { Platform } from "react-native";
import type { StateStorage } from "zustand/middleware";

const PUBLIC_DEMO_QUERY_PARAMETER = "demo";
const PUBLIC_DEMO_QUERY_VALUE = "1";

type LocationLikeGlobal = typeof globalThis & {
  location?: {
    search?: unknown;
  };
};

const PUBLIC_DEMO_DISCARD_STORAGE: StateStorage<void> = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function decodeQueryPart(value: string): string | null {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return null;
  }
}

function globalSearch(): string {
  const search = (globalThis as LocationLikeGlobal).location?.search;
  return typeof search === "string" ? search : "";
}

export function getPublicDemoQueryValue(name: string): string | null {
  const search = globalSearch();
  const queryStart = search.indexOf("?");
  const query = (queryStart >= 0 ? search.slice(queryStart + 1) : search)
    .split("#", 1)[0];

  for (const part of query.split("&")) {
    if (!part) {
      continue;
    }

    const separator = part.indexOf("=");
    const rawKey = separator >= 0 ? part.slice(0, separator) : part;
    const rawValue = separator >= 0 ? part.slice(separator + 1) : "";

    if (decodeQueryPart(rawKey) === name) {
      return decodeQueryPart(rawValue);
    }
  }

  return null;
}

/**
 * This module has no app-store imports so persisted stores can make the demo
 * storage decision before their automatic hydration begins.
 */
export const isPublicDemoEnabled =
  Platform.OS === "web" &&
  getPublicDemoQueryValue(PUBLIC_DEMO_QUERY_PARAMETER) ===
    PUBLIC_DEMO_QUERY_VALUE;

/**
 * Public demo stores must never read or write the visitor's normal app data.
 * Selecting the adapter during store creation also prevents a delayed normal
 * AsyncStorage hydration from replacing deterministic demo fixtures.
 */
export function publicDemoAwareStateStorage(
  normalStorage: StateStorage,
): StateStorage {
  return isPublicDemoEnabled ? PUBLIC_DEMO_DISCARD_STORAGE : normalStorage;
}
