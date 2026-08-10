export type ParkingSourceVerificationStatus =
  | "official"
  | "secondary"
  | "user-confirmed"
  | "unverified";

/** Provenance for independently verifiable parking data. */
export interface ParkingSourceMetadata {
  name: string;
  url?: string;
  /** ISO-8601 date or timestamp recording when this source was verified. */
  verifiedAt?: string;
  verificationStatus: ParkingSourceVerificationStatus;
  notes?: string;
}
