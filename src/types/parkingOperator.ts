export interface ParkingSmsProtocol {
  number: string;
  startTemplate: string;
  stopMessage: string;
}

export type ParkingOperatorEnvironment = "production" | "development";

export interface ParkingOperator {
  id: string;
  city: string;
  country: string;
  environment: ParkingOperatorEnvironment;
  sms: ParkingSmsProtocol;
}
