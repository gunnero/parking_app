import type { ParkingTariff } from "./parkingTariff";
import type { ParkingSourceMetadata } from "./parkingSource";

export type {
  ParkingSourceMetadata,
  ParkingSourceVerificationStatus,
} from "./parkingSource";

/** A GeoJSON position in [longitude, latitude, ...optional elements] order. */
export type GeoJsonPosition = [
  longitude: number,
  latitude: number,
  ...additionalElements: number[],
];

export type GeoJsonLinearRing = GeoJsonPosition[];
export type GeoJsonPolygonCoordinates = GeoJsonLinearRing[];
export type GeoJsonMultiPolygonCoordinates = GeoJsonPolygonCoordinates[];

export interface ParkingZonePolygonGeometry {
  type: "Polygon";
  coordinates: GeoJsonPolygonCoordinates;
}

export interface ParkingZoneMultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: GeoJsonMultiPolygonCoordinates;
}

export type ParkingZoneGeometry =
  | ParkingZonePolygonGeometry
  | ParkingZoneMultiPolygonGeometry;

export type ParkingZoneGeographyStatus = "test" | "unverified" | "verified";

/** Local `HH:mm` values are interpreted in the owning schedule's IANA time zone. */
export interface ParkingOperatingPeriod {
  startsAt: string;
  endsAt: string;
}

export type ParkingDaySchedule =
  | { status: "open"; periods: readonly ParkingOperatingPeriod[] }
  | { status: "closed" }
  | { status: "unknown" };

export interface ParkingWeeklySchedule {
  mondayToFriday: ParkingDaySchedule;
  saturday: ParkingDaySchedule;
  sunday: ParkingDaySchedule;
}

export interface ParkingHolidaySchedule {
  date: string;
  name?: string;
  schedule: ParkingDaySchedule;
}

export interface ParkingSeasonalSchedule extends ParkingWeeklySchedule {
  startsOn: string;
  endsOn: string;
  name?: string;
}

export interface ParkingOperatingSchedule extends ParkingWeeklySchedule {
  timeZone: string;
  holidays?: readonly ParkingHolidaySchedule[];
  seasonal?: readonly ParkingSeasonalSchedule[];
}

export interface ParkingZoneBase {
  id: string;
  city: string;
  code: string;
  name: string;
  description: string;
  operatorId: string;
  active: boolean;
  tariff: ParkingTariff;
  operatingSchedule?: ParkingOperatingSchedule;
  source: ParkingSourceMetadata;
}

export type ParkingZone =
  | (ParkingZoneBase & {
      geographyStatus: "test" | "verified";
      geometry: ParkingZoneGeometry;
    })
  | (ParkingZoneBase & {
      geographyStatus: "unverified";
      geometry?: ParkingZoneGeometry;
    });
