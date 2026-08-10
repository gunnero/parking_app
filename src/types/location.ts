export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export type LocationPermissionState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied";

export type LocationErrorCode =
  | "PERMISSION_DENIED"
  | "LOCATION_SERVICES_DISABLED"
  | "LOCATION_UNAVAILABLE"
  | "UNKNOWN";

export interface LocationError {
  code: LocationErrorCode;
  message: string;
}

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isLoading: boolean;
  permissionState: LocationPermissionState;
  error: LocationError | null;
}
