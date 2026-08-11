import type { PersistStorage } from "zustand/middleware";

import { TEST_PARKING_ZONES } from "../data/testParkingZones";
import type { ParkingReminderRuntimeSnapshot } from "../services/parkingReminderController";
import { useLocationStore } from "../stores/locationStore";
import { useParkingReminderStore } from "../stores/parkingReminderStore";
import { useParkingSessionStore } from "../stores/parkingSessionStore";
import { useThemeStore } from "../stores/themeStore";
import { useVehicleStore } from "../stores/vehicleStore";
import type { ThemePreference } from "../theme/types";
import type { LocationState } from "../types/location";
import type {
  ParkingSession,
  ParkingSessionStatus,
} from "../types/parkingSession";
import type { Vehicle } from "../types/vehicle";
import { createParkingDepartureState } from "../utils/parkingDepartureDetector";
import {
  restoreParkingSession,
  transitionParkingSession,
  type ParkingSessionEvent,
} from "../utils/parkingSessionState";
import { createParkingSessionDraft } from "../utils/parkingSmsEligibility";

export const VISUAL_PREVIEW_SCENARIOS = [
  "home-development",
  "home-no-zone",
  "home-permission-requesting",
  "home-permission-denied",
  "home-loading",
  "home-error",
  "session-preparing",
  "session-awaiting-confirmation",
  "session-active",
  "session-stopping",
  "session-awaiting-stop-confirmation",
  "session-completed",
  "session-failed",
  "reminder-on",
  "reminder-off",
  "reminder-permission",
  "reminder-unsupported",
  "reminder-error",
  "vehicles",
  "appearance",
] as const;

export type VisualPreviewScenario =
  (typeof VISUAL_PREVIEW_SCENARIOS)[number];
export type VisualPreviewRoute = "home" | "vehicles" | "appearance";

export interface VisualPreviewApplicationResult {
  applied: boolean;
  scenario: VisualPreviewScenario;
  route: VisualPreviewRoute;
  theme: ThemePreference;
}

const DEFAULT_SCENARIO: VisualPreviewScenario = "home-development";
const DEFAULT_THEME: ThemePreference = "system";
const PREVIEW_INSTANT = Date.now();
const PREVIEW_LOCATION = {
  latitude: 41.0305,
  longitude: 21.336,
  accuracy: 8,
} as const;

const PREVIEW_VEHICLES: readonly Vehicle[] = [
  {
    id: "preview-vehicle-bt7713ad",
    plate: "BT7713AD",
    nickname: "My car",
    isDefault: true,
  },
  {
    id: "preview-vehicle-sk1234ab",
    plate: "SK1234AB",
    nickname: "Family car",
    isDefault: false,
  },
  {
    id: "preview-vehicle-oh4321cd",
    plate: "OH4321CD",
    isDefault: false,
  },
];

const LOCATION_FIXTURES: Readonly<
  Record<
    | "development"
    | "no-zone"
    | "permission-requesting"
    | "permission-denied"
    | "loading"
    | "error",
    LocationState
  >
> = {
  development: {
    ...PREVIEW_LOCATION,
    isLoading: false,
    permissionState: "granted",
    error: null,
  },
  "no-zone": {
    latitude: 41.025,
    longitude: 21.325,
    accuracy: 12,
    isLoading: false,
    permissionState: "granted",
    error: null,
  },
  "permission-denied": {
    latitude: null,
    longitude: null,
    accuracy: null,
    isLoading: false,
    permissionState: "denied",
    error: {
      code: "PERMISSION_DENIED",
      message: "Location access is off. Allow it in Settings to detect a zone.",
    },
  },
  "permission-requesting": {
    latitude: null,
    longitude: null,
    accuracy: null,
    isLoading: false,
    permissionState: "requesting",
    error: null,
  },
  loading: {
    latitude: null,
    longitude: null,
    accuracy: null,
    isLoading: true,
    permissionState: "granted",
    error: null,
  },
  error: {
    latitude: null,
    longitude: null,
    accuracy: null,
    isLoading: false,
    permissionState: "granted",
    error: {
      code: "LOCATION_UNAVAILABLE",
      message: "A current GPS position is not available. Try again outdoors.",
    },
  },
};

const SESSION_SCENARIO_STATUS: Readonly<
  Partial<Record<VisualPreviewScenario, ParkingSessionStatus>>
> = {
  "session-preparing": "preparing",
  "session-awaiting-confirmation": "awaiting_confirmation",
  "session-active": "active",
  "session-stopping": "stopping",
  "session-awaiting-stop-confirmation": "awaiting_stop_confirmation",
  "session-completed": "completed",
  "session-failed": "failed",
};

const SCENARIO_SET = new Set<string>(VISUAL_PREVIEW_SCENARIOS);
const THEME_SET = new Set<ThemePreference>(["system", "light", "dark"]);

/**
 * The preview harness is deliberately unreachable in release bundles, even if
 * the public environment variable is accidentally present there.
 */
export const isVisualPreviewEnabled =
  __DEV__ && process.env.EXPO_PUBLIC_UI_PREVIEW === "1";

type LocationLikeGlobal = typeof globalThis & {
  location?: {
    search?: unknown;
  };
};

function globalSearch(): string {
  if (!isVisualPreviewEnabled) {
    return "";
  }

  const search = (globalThis as LocationLikeGlobal).location?.search;
  return typeof search === "string" ? search : "";
}

function decodeQueryPart(value: string): string | null {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return null;
  }
}

function queryValue(name: string, search = globalSearch()): string | null {
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
    const key = decodeQueryPart(rawKey);

    if (key === name) {
      return decodeQueryPart(rawValue);
    }
  }

  return null;
}

function normalizeScenario(value: unknown): VisualPreviewScenario {
  return typeof value === "string" && SCENARIO_SET.has(value)
    ? (value as VisualPreviewScenario)
    : DEFAULT_SCENARIO;
}

function normalizeTheme(value: unknown): ThemePreference {
  return typeof value === "string" &&
    THEME_SET.has(value as ThemePreference)
    ? (value as ThemePreference)
    : DEFAULT_THEME;
}

export function getVisualPreviewScenario(
  search?: string,
): VisualPreviewScenario {
  return normalizeScenario(queryValue("preview", search ?? globalSearch()));
}

export function getVisualPreviewTheme(search?: string): ThemePreference {
  return normalizeTheme(queryValue("theme", search ?? globalSearch()));
}

function routeForScenario(scenario: VisualPreviewScenario): VisualPreviewRoute {
  if (scenario === "vehicles") {
    return "vehicles";
  }

  if (scenario === "appearance") {
    return "appearance";
  }

  return "home";
}

export function getVisualPreviewRoute(search?: string): VisualPreviewRoute {
  return routeForScenario(getVisualPreviewScenario(search));
}

function isoOffset(milliseconds: number): string {
  return new Date(PREVIEW_INSTANT + milliseconds).toISOString();
}

function requireSessionTransition(
  session: ParkingSession,
  event: ParkingSessionEvent,
): ParkingSession {
  const result = transitionParkingSession(session, event);

  if (!result.success || !result.session) {
    throw new Error(
      result.success
        ? "Visual preview unexpectedly removed its parking session."
        : result.error,
    );
  }

  return result.session;
}

function createSessionFixtures(): Readonly<
  Record<ParkingSessionStatus, ParkingSession>
> {
  const zone = TEST_PARKING_ZONES[0];
  const vehicle = PREVIEW_VEHICLES[0];

  if (!zone || !vehicle) {
    throw new Error("Visual preview fixtures are unavailable.");
  }

  const draftResult = createParkingSessionDraft({
    zone,
    vehicle,
    startLocation: { ...PREVIEW_LOCATION },
    explicitUserAction: true,
    now: PREVIEW_INSTANT,
    sessionId: "visual-preview-test-a1-session",
  });

  if (!draftResult.success) {
    throw new Error(draftResult.reason);
  }

  const preparing = restoreParkingSession(draftResult.session);

  if (!preparing || preparing.status !== "preparing") {
    throw new Error("The visual preview parking draft is invalid.");
  }

  const awaitingConfirmation = requireSessionTransition(preparing, {
    type: "START_REQUEST_PREPARED",
    at: isoOffset(-32 * 60_000),
    result: "simulated",
  });
  const active = requireSessionTransition(awaitingConfirmation, {
    type: "CONFIRM_START",
    at: isoOffset(-31 * 60_000),
  });
  const stopping = requireSessionTransition(active, { type: "BEGIN_STOP" });
  const awaitingStopConfirmation = requireSessionTransition(stopping, {
    type: "STOP_REQUEST_PREPARED",
    at: isoOffset(-60_000),
    result: "simulated",
  });
  const completed = requireSessionTransition(awaitingStopConfirmation, {
    type: "CONFIRM_STOP",
    at: isoOffset(0),
  });
  const failed = restoreParkingSession({
    ...preparing,
    status: "failed",
  });

  if (!failed) {
    throw new Error("The visual preview failed-session fixture is invalid.");
  }

  return {
    preparing,
    awaiting_confirmation: awaitingConfirmation,
    active,
    stopping,
    awaiting_stop_confirmation: awaitingStopConfirmation,
    completed,
    failed,
  };
}

function locationForScenario(scenario: VisualPreviewScenario): LocationState {
  switch (scenario) {
    case "home-no-zone":
      return LOCATION_FIXTURES["no-zone"];
    case "home-permission-requesting":
      return LOCATION_FIXTURES["permission-requesting"];
    case "home-permission-denied":
      return LOCATION_FIXTURES["permission-denied"];
    case "home-loading":
      return LOCATION_FIXTURES.loading;
    case "home-error":
      return LOCATION_FIXTURES.error;
    default:
      return LOCATION_FIXTURES.development;
  }
}

function runtime(
  status: ParkingReminderRuntimeSnapshot["status"],
  reason: string,
  options: Partial<
    Pick<
      ParkingReminderRuntimeSnapshot,
      | "monitoringActive"
      | "canAskLocationAgain"
      | "canAskNotificationAgain"
    >
  > = {},
): ParkingReminderRuntimeSnapshot {
  return {
    status,
    reason,
    monitoringActive: options.monitoringActive ?? false,
    canAskLocationAgain: options.canAskLocationAgain ?? false,
    canAskNotificationAgain: options.canAskNotificationAgain ?? false,
  };
}

function installDiscardStorage(): void {
  const createStorage = <T,>(): PersistStorage<T, void> => ({
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });

  useVehicleStore.persist.setOptions({ storage: createStorage() });
  useParkingSessionStore.persist.setOptions({ storage: createStorage() });
  useThemeStore.persist.setOptions({ storage: createStorage() });

  // Restarting against the synchronous discard stores invalidates any
  // in-flight AsyncStorage hydration that began while modules were loading.
  // This keeps old device data from replacing deterministic preview fixtures.
  void useVehicleStore.persist.rehydrate();
  void useParkingSessionStore.persist.rehydrate();
  void useThemeStore.persist.rehydrate();
}

function applyReminderFixture(
  scenario: VisualPreviewScenario,
  activeSession: ParkingSession,
  selectedSession: ParkingSession | null,
): void {
  let enabled = true;
  let reminderRuntime = selectedSession?.status === "active"
    ? runtime("monitoring", "Departure reminder is active.", {
        monitoringActive: true,
      })
    : runtime(
        "inactive",
        selectedSession
          ? "Departure monitoring starts only while parking is active."
          : "No active parking session.",
      );
  let detectorState = selectedSession?.status === "active"
    ? createParkingDepartureState(activeSession.id)
    : null;
  let error: string | null = null;

  switch (scenario) {
    case "reminder-on":
      enabled = true;
      reminderRuntime = runtime("monitoring", "Departure reminder is active.", {
        monitoringActive: true,
      });
      detectorState = createParkingDepartureState(activeSession.id);
      break;
    case "reminder-off":
      enabled = false;
      reminderRuntime = runtime("disabled", "Departure reminders are off.");
      detectorState = null;
      break;
    case "reminder-permission":
      enabled = true;
      reminderRuntime = runtime(
        "permission-required",
        "Background location permission is needed for departure reminders.",
        { canAskLocationAgain: true },
      );
      detectorState = null;
      break;
    case "reminder-unsupported":
      enabled = true;
      reminderRuntime = runtime(
        "unsupported",
        "Background departure reminders are not supported on this device.",
      );
      detectorState = null;
      break;
    case "reminder-error":
      enabled = true;
      reminderRuntime = runtime(
        "error",
        "Parking reminder availability could not be checked.",
      );
      detectorState = null;
      error = "Parking reminder availability could not be checked.";
      break;
    default:
      break;
  }

  useParkingReminderStore.setState({
    enabled,
    hasHydrated: true,
    isBusy: false,
    isUserActionBusy: false,
    runtime: reminderRuntime,
    detectorState,
    error,
    preferenceNeedsSave: false,
  });
}

/**
 * Applies presentation-only fixtures with direct store updates. It calls no
 * store actions and no location, SMS, permission, notification, or background
 * service. Persisted stores are first redirected to discard-only storage.
 */
export function applyVisualPreviewScenario(
  scenarioInput: VisualPreviewScenario = getVisualPreviewScenario(),
  themeInput: ThemePreference = getVisualPreviewTheme(),
): VisualPreviewApplicationResult {
  const scenario = normalizeScenario(scenarioInput);
  const theme = normalizeTheme(themeInput);
  const route = routeForScenario(scenario);

  if (!isVisualPreviewEnabled) {
    return { applied: false, scenario, route, theme };
  }

  installDiscardStorage();

  const sessions = createSessionFixtures();
  const status = SESSION_SCENARIO_STATUS[scenario];
  const isReminderScenario = scenario.startsWith("reminder-");
  const selectedSession = status
    ? sessions[status]
    : isReminderScenario
      ? sessions.active
      : null;

  useThemeStore.setState({ preference: theme, hasHydrated: true });
  useVehicleStore.setState({
    vehicles: PREVIEW_VEHICLES.map((vehicle) => ({ ...vehicle })),
    hasHydrated: true,
  });
  useLocationStore.setState({ ...locationForScenario(scenario) });
  useParkingSessionStore.setState({
    session: selectedSession,
    hasHydrated: true,
    operationError:
      scenario === "session-failed"
        ? "The parking request could not be prepared."
        : null,
    smsFlowInFlight: false,
  });
  applyReminderFixture(scenario, sessions.active, selectedSession);

  return { applied: true, scenario, route, theme };
}
