import { TEST_PARKING_ZONES } from "../data/testParkingZones";
import {
  setParkingHistoryStorageAdapterForTesting,
  useParkingHistoryStore,
} from "../stores/parkingHistoryStore";
import { useLocationStore } from "../stores/locationStore";
import { useParkingReminderStore } from "../stores/parkingReminderStore";
import { useParkingSessionStore } from "../stores/parkingSessionStore";
import { useThemeStore } from "../stores/themeStore";
import { useLanguageStore } from "../stores/languageStore";
import { useVehicleStore } from "../stores/vehicleStore";
import type { LocationCoordinates, LocationState } from "../types/location";
import type { Vehicle } from "../types/vehicle";
import {
  getPublicDemoQueryValue,
  isPublicDemoEnabled,
} from "./publicDemoEnvironment";

const PUBLIC_DEMO_ZONE_CODE = "TEST-A1";
const DEMO_COORDINATE_TOLERANCE = 1e-7;

const PUBLIC_DEMO_LOCATION: Readonly<LocationCoordinates> = Object.freeze({
  latitude: 41.0305,
  longitude: 21.336,
  accuracy: 8,
});

const PUBLIC_DEMO_LOCATION_STATE: Readonly<LocationState> = Object.freeze({
  ...PUBLIC_DEMO_LOCATION,
  isLoading: false,
  permissionState: "granted",
  error: null,
});

const PUBLIC_DEMO_VEHICLE: Readonly<Vehicle> = Object.freeze({
  id: "public-demo-vehicle-bt7713ad",
  plate: "BT7713AD",
  isDefault: true,
});

export interface PublicDemoApplicationResult {
  readonly applied: boolean;
  readonly zoneCode: typeof PUBLIC_DEMO_ZONE_CODE | null;
}

/**
 * Public demo mode is deliberately web-only. It is always enabled on the
 * meeting host and can be enabled on local/alternate hosts with the exact
 * `?demo=1` query parameter. It is never enabled by a build-time environment
 * variable or on a native build.
 */
function publicDemoLanguage(): "en" | "mk" | "system" {
  const value = getPublicDemoQueryValue("lang");
  return value === "mk" || value === "en" ? value : "system";
}

function setPublicDemoLocation(): void {
  useLocationStore.setState({ ...PUBLIC_DEMO_LOCATION_STATE });
}

async function refreshPublicDemoLocation(): Promise<void> {
  setPublicDemoLocation();
}

function setPublicDemoReminderOff(): void {
  useParkingReminderStore.setState({
    enabled: false,
    hasHydrated: true,
    isBusy: false,
    isUserActionBusy: false,
    runtime: {
      status: "disabled",
      reason: "Departure reminders are off.",
      monitoringActive: false,
      canAskLocationAgain: false,
      canAskNotificationAgain: false,
    },
    detectorState: null,
    error: null,
    preferenceNeedsSave: false,
  });
}

async function keepPublicDemoReminderOff(): Promise<void> {
  setPublicDemoReminderOff();
}

/**
 * Applies a deterministic, presentation-only TEST-A1 scenario.
 *
 * The function calls no location, SMS, permission, notification, background,
 * or storage service. Persisted Zustand stores select synchronous discard
 * storage during module initialization, before their first hydration starts.
 * Reminder and location actions are replaced with in-memory demo actions for
 * the remainder of this web page load, so interacting with the demo cannot
 * request native capabilities.
 */
export function applyPublicDemoScenario(): PublicDemoApplicationResult {
  if (!isPublicDemoEnabled) {
    return { applied: false, zoneCode: null };
  }

  setParkingHistoryStorageAdapterForTesting({
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });

  useParkingHistoryStore.setState({
    records: [],
    hasHydrated: true,
    isHydrating: false,
    isReadOnly: false,
    hydrationError: null,
    operationError: null,
  });
  useVehicleStore.setState({
    vehicles: [{ ...PUBLIC_DEMO_VEHICLE }],
    hasHydrated: true,
  });
  useParkingSessionStore.setState({
    session: null,
    hasHydrated: true,
    operationError: null,
    smsFlowInFlight: false,
  });
  useThemeStore.setState({ hasHydrated: true });
  useLanguageStore.setState({
    preference: publicDemoLanguage(),
    hasHydrated: true,
  });
  useLocationStore.setState({
    ...PUBLIC_DEMO_LOCATION_STATE,
    refreshLocation: refreshPublicDemoLocation,
  });
  useParkingReminderStore.setState({
    hydrate: keepPublicDemoReminderOff,
    refreshFromStorage: keepPublicDemoReminderOff,
    reconcile: keepPublicDemoReminderOff,
    setEnabled: keepPublicDemoReminderOff,
    setupPermissions: keepPublicDemoReminderOff,
  });
  setPublicDemoReminderOff();

  const demoZone = TEST_PARKING_ZONES.find(
    (zone) => zone.code === PUBLIC_DEMO_ZONE_CODE,
  );

  if (!demoZone || demoZone.geographyStatus !== "test") {
    // Stay in isolated demo mode even if the fixture is misconfigured. The
    // location/reminder actions above remain inert and no native effect runs.
    return { applied: true, zoneCode: null };
  }

  return { applied: true, zoneCode: PUBLIC_DEMO_ZONE_CODE };
}

/** True only for the fixed TEST-A1 coordinates during an explicit web demo. */
export function isDemoLocation(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  return (
    isPublicDemoEnabled &&
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Math.abs(latitude - PUBLIC_DEMO_LOCATION.latitude) <=
      DEMO_COORDINATE_TOLERANCE &&
    Math.abs(longitude - PUBLIC_DEMO_LOCATION.longitude) <=
      DEMO_COORDINATE_TOLERANCE
  );
}
