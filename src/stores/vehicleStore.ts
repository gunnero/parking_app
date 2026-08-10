import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  Vehicle,
  VehicleInput,
  VehicleMutationResult,
  VehicleUpdateInput,
} from "../types/vehicle";
import { normalizePlate, validatePlate } from "../utils/plate";

const VEHICLE_STORAGE_KEY = "parkingapp-vehicles";

const INITIAL_VEHICLE: Vehicle = {
  id: "vehicle-bt7713ad",
  plate: "BT7713AD",
  isDefault: true,
};

export interface VehicleStoreState {
  vehicles: Vehicle[];
  hasHydrated: boolean;
  addVehicle: (input: VehicleInput) => VehicleMutationResult;
  updateVehicle: (
    id: string,
    input: VehicleUpdateInput,
  ) => VehicleMutationResult;
  deleteVehicle: (id: string) => VehicleMutationResult;
  setDefaultVehicle: (id: string) => VehicleMutationResult;
}

type PersistedVehicleState = Pick<VehicleStoreState, "vehicles">;

function createVehicleId(): string {
  return `vehicle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeNickname(nickname?: string): string | undefined {
  const normalizedNickname = nickname?.trim();
  return normalizedNickname || undefined;
}

function ensureSingleDefault(vehicles: Vehicle[]): Vehicle[] {
  if (vehicles.length === 0) {
    return vehicles;
  }

  const existingDefaultIndex = vehicles.findIndex((vehicle) => vehicle.isDefault);
  const defaultIndex = existingDefaultIndex >= 0 ? existingDefaultIndex : 0;

  return vehicles.map((vehicle, index) => {
    const isDefault = index === defaultIndex;

    return vehicle.isDefault === isDefault
      ? vehicle
      : { ...vehicle, isDefault };
  });
}

function restorePersistedVehicles(value: unknown): Vehicle[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const restoredVehicles: Vehicle[] = [];
  const ids = new Set<string>();
  const plates = new Set<string>();

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("id" in item) ||
      !("plate" in item) ||
      typeof item.id !== "string" ||
      typeof item.plate !== "string"
    ) {
      continue;
    }

    const id = item.id.trim();
    const plate = normalizePlate(item.plate);

    if (!id || !validatePlate(plate) || ids.has(id) || plates.has(plate)) {
      continue;
    }

    const nickname =
      "nickname" in item && typeof item.nickname === "string"
        ? normalizeNickname(item.nickname)
        : undefined;
    const vehicle: Vehicle = {
      id,
      plate,
      isDefault: "isDefault" in item && item.isDefault === true,
      ...(nickname ? { nickname } : {}),
    };

    ids.add(id);
    plates.add(plate);
    restoredVehicles.push(vehicle);
  }

  return ensureSingleDefault(restoredVehicles);
}

function plateError(plate: string): VehicleMutationResult | null {
  if (validatePlate(plate)) {
    return null;
  }

  return {
    success: false,
    error: "Use 2 letters, 3 or 4 digits, then 2 letters (for example BT7713AD).",
  };
}

let markHydrationFinished: (() => void) | undefined;

export const useVehicleStore = create<VehicleStoreState>()(
  persist(
    (set, get) => {
      markHydrationFinished = () => set({ hasHydrated: true });

      return {
        vehicles: [{ ...INITIAL_VEHICLE }],
        hasHydrated: false,

        addVehicle: (input) => {
          const plate = normalizePlate(input.plate);
          const validationError = plateError(plate);

          if (validationError) {
            return validationError;
          }

          const vehicles = get().vehicles;

          if (vehicles.some((vehicle) => normalizePlate(vehicle.plate) === plate)) {
            return {
              success: false,
              error: `A vehicle with plate ${plate} already exists.`,
            };
          }

          const nickname = normalizeNickname(input.nickname);
          const vehicle: Vehicle = {
            id: createVehicleId(),
            plate,
            isDefault: vehicles.length === 0,
            ...(nickname ? { nickname } : {}),
          };

          set({ vehicles: ensureSingleDefault([...vehicles, vehicle]) });

          return { success: true, vehicle };
        },

        updateVehicle: (id, input) => {
          const vehicles = get().vehicles;
          const existingVehicle = vehicles.find((vehicle) => vehicle.id === id);

          if (!existingVehicle) {
            return { success: false, error: "Vehicle not found." };
          }

          const plate =
            input.plate === undefined
              ? existingVehicle.plate
              : normalizePlate(input.plate);
          const validationError = plateError(plate);

          if (validationError) {
            return validationError;
          }

          if (
            vehicles.some(
              (vehicle) =>
                vehicle.id !== id && normalizePlate(vehicle.plate) === plate,
            )
          ) {
            return {
              success: false,
              error: `A vehicle with plate ${plate} already exists.`,
            };
          }

          const updatedVehicle: Vehicle = {
            ...existingVehicle,
            plate,
          };

          if (input.nickname !== undefined) {
            const nickname = normalizeNickname(input.nickname);

            if (nickname) {
              updatedVehicle.nickname = nickname;
            } else {
              delete updatedVehicle.nickname;
            }
          }

          const updatedVehicles = ensureSingleDefault(
            vehicles.map((vehicle) =>
              vehicle.id === id ? updatedVehicle : vehicle,
            ),
          );
          const persistedVehicle =
            updatedVehicles.find((vehicle) => vehicle.id === id) ?? updatedVehicle;

          set({ vehicles: updatedVehicles });

          return { success: true, vehicle: persistedVehicle };
        },

        deleteVehicle: (id) => {
          const vehicles = get().vehicles;

          if (!vehicles.some((vehicle) => vehicle.id === id)) {
            return { success: false, error: "Vehicle not found." };
          }

          set({
            vehicles: ensureSingleDefault(
              vehicles.filter((vehicle) => vehicle.id !== id),
            ),
          });

          return { success: true };
        },

        setDefaultVehicle: (id) => {
          const vehicles = get().vehicles;
          const existingVehicle = vehicles.find((vehicle) => vehicle.id === id);

          if (!existingVehicle) {
            return { success: false, error: "Vehicle not found." };
          }

          const updatedVehicles = vehicles.map((vehicle) => ({
            ...vehicle,
            isDefault: vehicle.id === id,
          }));
          const defaultVehicle = updatedVehicles.find((vehicle) => vehicle.id === id);

          set({ vehicles: updatedVehicles });

          return { success: true, vehicle: defaultVehicle };
        },
      };
    },
    {
      name: VEHICLE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedVehicleState => ({
        vehicles: state.vehicles,
      }),
      merge: (persistedState, currentState) => {
        const storedVehicles = restorePersistedVehicles(
          (persistedState as Partial<PersistedVehicleState> | undefined)
            ?.vehicles,
        );

        return {
          ...currentState,
          vehicles: storedVehicles ?? currentState.vehicles,
        };
      },
      onRehydrateStorage: () => () => {
        markHydrationFinished?.();
      },
    },
  ),
);

export const selectDefaultVehicle = (
  state: VehicleStoreState,
): Vehicle | undefined =>
  state.vehicles.find((vehicle) => vehicle.isDefault);
