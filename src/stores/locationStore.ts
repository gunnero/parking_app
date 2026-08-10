import { create } from "zustand";

import {
  getCurrentLocation,
  requestForegroundLocationPermission,
  toLocationError,
} from "../services/locationService";
import type { LocationState } from "../types/location";

export interface LocationStoreState extends LocationState {
  refreshLocation: () => Promise<void>;
}

const INITIAL_LOCATION_STATE: LocationState = {
  latitude: null,
  longitude: null,
  accuracy: null,
  isLoading: false,
  permissionState: "idle",
  error: null,
};

export const useLocationStore = create<LocationStoreState>((set, get) => ({
  ...INITIAL_LOCATION_STATE,

  refreshLocation: async () => {
    const { isLoading, permissionState } = get();

    if (isLoading || permissionState === "requesting") {
      return;
    }

    set({
      latitude: null,
      longitude: null,
      accuracy: null,
      isLoading: false,
      permissionState: "requesting",
      error: null,
    });

    try {
      await requestForegroundLocationPermission();

      set({
        permissionState: "granted",
        isLoading: true,
      });

      const coordinates = await getCurrentLocation();

      set({
        ...coordinates,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const locationError = toLocationError(error);
      const currentPermissionState = get().permissionState;

      set({
        latitude: null,
        longitude: null,
        accuracy: null,
        isLoading: false,
        permissionState:
          locationError.code === "PERMISSION_DENIED"
            ? "denied"
            : currentPermissionState === "granted"
              ? "granted"
              : "idle",
        error: locationError,
      });
    }
  },
}));
