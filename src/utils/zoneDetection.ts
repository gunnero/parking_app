import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { multiPolygon, point, polygon } from "@turf/helpers";

import type {
  GeoJsonLinearRing,
  GeoJsonMultiPolygonCoordinates,
  GeoJsonPolygonCoordinates,
  GeoJsonPosition,
  ParkingZone,
  ParkingZoneGeometry,
} from "../types/parkingZone";

/**
 * Returns the first active test/verified zone containing the supplied GPS
 * point. Unverified zones and zones without structurally usable GeoJSON are
 * intentionally excluded. GeoJSON and Turf use [longitude, latitude] order,
 * while this function accepts the latitude/longitude order used by location
 * APIs.
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
    try {
      if (
        !zone ||
        !zone.active ||
        (zone.geographyStatus !== "test" &&
          zone.geographyStatus !== "verified") ||
        !isUsableGeometry(zone.geometry)
      ) {
        continue;
      }

      const containsPoint =
        zone.geometry.type === "Polygon"
          ? booleanPointInPolygon(
              currentPoint,
              polygon(zone.geometry.coordinates),
            )
          : booleanPointInPolygon(
              currentPoint,
              multiPolygon(zone.geometry.coordinates),
            );

      if (containsPoint) {
        return zone;
      }
    } catch {
      // A malformed catalogue entry must not break detection for other zones.
      continue;
    }
  }

  return null;
}

function isUsableGeometry(value: unknown): value is ParkingZoneGeometry {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }

  if (value.type === "Polygon") {
    return (
      "coordinates" in value &&
      isPolygonCoordinates(value.coordinates)
    );
  }

  if (value.type === "MultiPolygon") {
    return (
      "coordinates" in value &&
      isMultiPolygonCoordinates(value.coordinates)
    );
  }

  return false;
}

function isMultiPolygonCoordinates(
  value: unknown,
): value is GeoJsonMultiPolygonCoordinates {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  for (const polygonCoordinates of value) {
    if (!isPolygonCoordinates(polygonCoordinates)) {
      return false;
    }
  }

  return true;
}

function isPolygonCoordinates(
  value: unknown,
): value is GeoJsonPolygonCoordinates {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  for (const ring of value) {
    if (!isLinearRing(ring)) {
      return false;
    }
  }

  return true;
}

function isLinearRing(value: unknown): value is GeoJsonLinearRing {
  if (!Array.isArray(value) || value.length < 4) {
    return false;
  }

  for (const position of value) {
    if (!isGeoJsonPosition(position)) {
      return false;
    }
  }

  const firstPosition = value[0];
  const lastPosition = value[value.length - 1];

  return (
    positionsAreEquivalent(firstPosition, lastPosition) &&
    hasNonZeroArea(value)
  );
}

function isGeoJsonPosition(value: unknown): value is GeoJsonPosition {
  if (!Array.isArray(value) || value.length < 2) {
    return false;
  }

  for (const element of value) {
    if (typeof element !== "number" || !Number.isFinite(element)) {
      return false;
    }
  }

  const [positionLongitude, positionLatitude] = value;

  return (
    positionLongitude >= -180 &&
    positionLongitude <= 180 &&
    positionLatitude >= -90 &&
    positionLatitude <= 90
  );
}

function positionsAreEquivalent(
  firstPosition: GeoJsonPosition,
  lastPosition: GeoJsonPosition,
): boolean {
  if (firstPosition.length !== lastPosition.length) {
    return false;
  }

  return firstPosition.every(
    (element, index) => element === lastPosition[index],
  );
}

function hasNonZeroArea(ring: GeoJsonLinearRing): boolean {
  let twiceArea = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const currentPosition = ring[index];
    const nextPosition = ring[index + 1];

    twiceArea +=
      currentPosition[0] * nextPosition[1] -
      nextPosition[0] * currentPosition[1];
  }

  return Number.isFinite(twiceArea) && Math.abs(twiceArea) > Number.EPSILON;
}
