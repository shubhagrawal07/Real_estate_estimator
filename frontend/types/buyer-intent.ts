export type BuyerIntentTypeApi =
  | 'HIGH_INTEREST'
  | 'ALERT_AVAILABLE'
  | 'AREA_INTEREST'
  | 'QUESTION';

export interface BuyerIntentFlags {
  highInterest: boolean;
  alertActive: boolean;
}

export interface CreateBuyerIntentPayload {
  propertyId: string;
  intentType: BuyerIntentTypeApi;
  message?: string;
  budget?: number;
}

export interface BuyerIntentRecord {
  id: string;
  userId: string;
  propertyId: string;
  intentType: BuyerIntentTypeApi;
  notifSent: boolean;
  budget?: number | null;
  message?: string | null;
  createdAt: string;
}
