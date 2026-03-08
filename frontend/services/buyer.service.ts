import { api } from './api';
import type { RankedProperty } from '@/types/estimate';

export interface BuyerSearchParams {
  propertyType: string;
  cityInseeCode: string;
  cadastralSection?: string;
  budget: number;
  bedrooms: number;
  minSurfaceArea: number;
  pool?: boolean;
  minLandArea?: number;
}

export const buyerService = {
  search: (params: BuyerSearchParams, token: string) =>
    api.post<{ properties: RankedProperty[]; count: number }>(
      '/buyer/search',
      params,
      token
    ),
};
