export type EstimateFeedback = 'accurate' | 'high' | 'low' | 'inaccurate';

export interface PropertyEstimateResponse {
  propertyId: string;
  userId?: string;
  address: string;
  locationCode: string;
  longitude?: number;
  latitude?: number;
  estimatedPrice?: number;
  basePricePerSqM?: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  type: string;
  status?: string;
  createdDate?: string;
  buyerTracking?: boolean;
  feedback?: EstimateFeedback;
  apartmentDetails?: Record<string, unknown>;
  houseDetails?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BuyerSearchCriteria {
  propertyType: string;
  cityInseeCode: string;
  cadastralSection?: string;
  budget: number;
  bedrooms: number;
  minSurfaceArea: number;
  pool?: boolean;
  minLandArea?: number;
}

export interface RankedProperty {
  propertyId: string;
  address: string;
  latitude?: number;
  longitude?: number;
  estimatedPrice?: number;
  type: string;
  area: number;
  bedrooms: number;
  rankScore: number;
  budgetScore: number;
  surfaceAreaScore: number;
  bedroomScore: number;
  poolScore?: number;
  landAreaScore?: number;
}

export interface EngagementRecord {
  engagementLevel: number;
  interested: boolean;
}

export interface EngagementClickPayload {
  propertyId: string;
  budget: number;
  bedrooms: number;
  minSurfaceArea: number;
  pool?: boolean;
  minLandArea?: number | null;
}

export interface BatchEngagementsResponse {
  engagements: Record<string, EngagementRecord>;
}

export interface UpdateEngagementBody {
  feedback?: EstimateFeedback;
  buyerTracking?: boolean;
}

export interface BuyerInterestResponse {
  hasHighBuyerInterest: boolean;
}

/** Anonymous potential buyer entry (budget + matching criteria only). */
export interface PotentialBuyerEntry {
  budget: number;
  bedrooms: number;
  surfaceMin: number;
  landArea?: number | null;
  pool: boolean;
  engagementLevel: number;
  interested: boolean;
}

export type FinancingStatus =
  | 'ready_to_buy'
  | 'in_progress'
  | 'not_yet'
  | 'need_to_sell_first';

export interface SellerAlertItem {
  id: string;
  type: string;
  propertyId: string;
  address?: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  read: boolean;
}
