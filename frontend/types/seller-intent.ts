export type ProfileType = 'SELLER' | 'BUYER' | 'SELLER_BUYER' | 'CURIOUS';

export type IntentType =
  | 'SELL_INTENT'
  | 'HIGH_INTEREST'
  | 'ALERT_AVAILABLE'
  | 'AREA_INTEREST'
  | 'AREA_WATCH'
  | 'QUESTION';

export type Timeline = 'NOW' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'UNDEFINED';

export type SellPreference = 'DISCREET' | 'CLASSIC' | 'UNDEFINED';

export interface CreateSellerIntentPayload {
  propertyId: string;
  profileType: ProfileType;
  intentType?: IntentType | null;
  targetPrice?: number | null;
  timeline?: Timeline | null;
  sellPreference?: SellPreference | null;
  notifyAgent?: boolean;
}

export interface DvfPreviewRow {
  typeLabel: string;
  locationLabel: string;
  price: number;
  monthsAgo: number;
}

export interface DvfPreviewResponse {
  success: boolean;
  data: { rows: DvfPreviewRow[] };
}

export interface SellerIntentCreateResponse {
  success: boolean;
  data: {
    id: string;
    notifSent: boolean;
  };
}
