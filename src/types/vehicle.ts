export interface Vehicle {
  id: string;
  plate: string;
  nickname?: string;
  isDefault: boolean;
}

export interface VehicleInput {
  plate: string;
  nickname?: string;
}

export interface VehicleUpdateInput {
  plate?: string;
  nickname?: string;
}

export interface VehicleMutationResult {
  success: boolean;
  vehicle?: Vehicle;
  error?: string;
}
