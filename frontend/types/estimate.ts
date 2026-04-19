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
  /** Display name for the selected city (optional; older session data may omit). */
  cityLabel?: string;
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
  cityInseeCode: string;
  cadastralSection: string;
  locationCode: string;
}

export interface UpdateEngagementBody {
  feedback?: EstimateFeedback;
  buyerTracking?: boolean;
}

/** Anonymous potential buyer row (from buyer intent aggregation). */
export interface PotentialBuyerEntry {
  budget: number | null;
  bedrooms: number;
  surfaceMin: number;
  landArea?: number | null;
  pool: boolean;
  engagementLevel: number;
  interested: boolean;
  /** Shown instead of bedrooms/surface when present. */
  criteriaSummary?: string;
}

export interface SellerAlertItem {
  id: string;
  type: string;
  propertyId: string;
  address?: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  read: boolean;
}
