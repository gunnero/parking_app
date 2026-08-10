import type { ParkingZone } from "../types/parkingZone";

/**
 * TEST DATA ONLY.
 *
 * These synthetic rectangles exist only to exercise PARK-001 zone detection.
 * They are NOT official or surveyed Bitola parking boundaries. They include no
 * real pricing and `smsNumber` is an intentionally non-dialable placeholder,
 * not an SMS parking rule or destination.
 */
export const BITOLA_TEST_ZONES: ParkingZone[] = [
  {
    id: "bitola-test-a1",
    city: "Bitola",
    code: "TEST-A1",
    name: "TEST ONLY - Synthetic Zone A1",
    smsNumber: "TEST-ONLY-NO-SMS",
    polygonCoordinates: [
      [
        [21.334, 41.029],
        [21.338, 41.029],
        [21.338, 41.032],
        [21.334, 41.032],
        [21.334, 41.029],
      ],
    ],
    active: true,
  },
  {
    id: "bitola-test-a2",
    city: "Bitola",
    code: "TEST-A2",
    name: "TEST ONLY - Synthetic Zone A2",
    smsNumber: "TEST-ONLY-NO-SMS",
    polygonCoordinates: [
      [
        [21.339, 41.029],
        [21.343, 41.029],
        [21.343, 41.032],
        [21.339, 41.032],
        [21.339, 41.029],
      ],
    ],
    active: true,
  },
];
