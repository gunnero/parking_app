export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

const EARTH_RADIUS_METERS = 6_371_008.8;

export function isValidGeoPoint(value: unknown): value is GeoPoint {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const point = value as Partial<GeoPoint>;

  return (
    typeof point.latitude === "number" &&
    Number.isFinite(point.latitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    typeof point.longitude === "number" &&
    Number.isFinite(point.longitude) &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Returns great-circle distance in meters. Callers must provide valid latitude
 * and longitude values; invalid points throw instead of producing NaN.
 */
export function haversineDistanceMeters(from: GeoPoint, to: GeoPoint): number {
  if (!isValidGeoPoint(from) || !isValidGeoPoint(to)) {
    throw new RangeError("Haversine distance requires valid coordinates.");
  }

  const latitudeDelta = degreesToRadians(to.latitude - from.latitude);
  const longitudeDelta = degreesToRadians(to.longitude - from.longitude);
  const fromLatitude = degreesToRadians(from.latitude);
  const toLatitude = degreesToRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const clampedHaversine = Math.min(1, Math.max(0, haversine));
  const angularDistance =
    2 *
    Math.atan2(Math.sqrt(clampedHaversine), Math.sqrt(1 - clampedHaversine));

  return EARTH_RADIUS_METERS * angularDistance;
}
