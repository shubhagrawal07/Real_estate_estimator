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
  triggerPrice?: number;
  engagementLevel?: number;
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
