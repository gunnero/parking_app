import type { ParkingZone } from "../types/parkingZone";

export const TEST_PARKING_OPERATOR_ID = "development-test-parking";

const TEST_DATA_SOURCE = {
  name: "PARK-001 synthetic development fixture",
  verificationStatus: "unverified",
  notes:
    "Created for local testing only; not sourced from an official Bitola GIS dataset.",
} as const;

/**
 * DEVELOPMENT DATA ONLY.
 *
 * These synthetic polygons exist solely to exercise GPS zone detection. They
 * are not official or surveyed Bitola parking boundaries and contain no real
 * tariff, operating schedule, SMS rule, or other parking-system information.
 */
export const TEST_PARKING_ZONES: readonly ParkingZone[] = [
  {
    id: "bitola-test-a1",
    city: "Bitola",
    code: "TEST-A1",
    name: "Development Zone TEST-A1",
    description:
      "Synthetic development fixture only; not an official Bitola parking zone.",
    operatorId: TEST_PARKING_OPERATOR_ID,
    active: true,
    geographyStatus: "test",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [21.334, 41.029],
          [21.338, 41.029],
          [21.338, 41.032],
          [21.334, 41.032],
          [21.334, 41.029],
        ],
      ],
    },
    tariff: {
      type: "unknown",
      source: TEST_DATA_SOURCE,
      notes: "No real pricing is associated with this development fixture.",
    },
    source: TEST_DATA_SOURCE,
  },
  {
    id: "bitola-test-a2",
    city: "Bitola",
    code: "TEST-A2",
    name: "Development Zone TEST-A2",
    description:
      "Synthetic development fixture only; not an official Bitola parking zone.",
    operatorId: TEST_PARKING_OPERATOR_ID,
    active: true,
    geographyStatus: "test",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [21.339, 41.029],
          [21.343, 41.029],
          [21.343, 41.032],
          [21.339, 41.032],
          [21.339, 41.029],
        ],
      ],
    },
    tariff: {
      type: "unknown",
      source: TEST_DATA_SOURCE,
      notes: "No real pricing is associated with this development fixture.",
    },
    source: TEST_DATA_SOURCE,
  },
];
