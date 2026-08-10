import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";

import type { ParkingZone } from "../types/parkingZone";

/**
 * Returns the first active zone containing the supplied GPS point. GeoJSON and
 * Turf use [longitude, latitude] order, while this function accepts the more
 * familiar latitude/longitude argument order used by location APIs.
 */
export function detectParkingZone(
  latitude: number,
  longitude: number,
  zones: readonly ParkingZone[],
): ParkingZone | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const currentPoint = point([longitude, latitude]);

  for (const zone of zones) {
    if (!zone.active) {
      continue;
    }

    const zonePolygon = polygon(zone.polygonCoordinates);

    if (booleanPointInPolygon(currentPoint, zonePolygon)) {
      return zone;
    }
  }

  return null;
}
