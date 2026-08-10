export interface ParkingSmsProtocol {
  number: string;
  startTemplate: string;
  stopMessage: string;
}

export interface ParkingOperator {
  id: string;
  city: string;
  country: string;
  sms: ParkingSmsProtocol;
}
