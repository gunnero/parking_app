/** A GeoJSON position in [longitude, latitude] order. */
export type GeoJsonPosition = [longitude: number, latitude: number];

/**
 * GeoJSON Polygon coordinates. The outer array contains the exterior ring and
 * can optionally contain interior rings (holes).
 */
export type ParkingZonePolygonCoordinates = GeoJsonPosition[][];

export interface ParkingZonePriceMetadata {
  amount: number;
  currency: string;
  billingPeriodMinutes?: number;
  label?: string;
}

export interface ParkingZone {
  id: string;
  city: string;
  code: string;
  name: string;
  smsNumber: string;
  polygonCoordinates: ParkingZonePolygonCoordinates;
  price?: ParkingZonePriceMetadata;
  active: boolean;
}
