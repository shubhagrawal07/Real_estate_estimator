import { api } from './api';
import type {
  BuyerSearchCriteria,
  EngagementRecord,
} from '@/types/estimate';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const buyerEngagementService = {
  recordClick: (
    propertyId: string,
    criteria: Pick<
      BuyerSearchCriteria,
      'budget' | 'bedrooms' | 'minSurfaceArea' | 'pool' | 'minLandArea'
    >,
    token: string
  ) =>
    api
      .post<ApiResponse<EngagementRecord>>('/buyer-engagement/click', {
        propertyId,
        budget: criteria.budget,
        bedrooms: criteria.bedrooms,
        minSurfaceArea: criteria.minSurfaceArea,
        pool: criteria.pool,
        minLandArea: criteria.minLandArea ?? null,
      }, token)
      .then((res) => res.data),

  toggleInterested: (
    propertyId: string,
    criteria: Pick<
      BuyerSearchCriteria,
      'budget' | 'bedrooms' | 'minSurfaceArea' | 'pool' | 'minLandArea'
    >,
    token: string
  ) =>
    api
      .post<ApiResponse<EngagementRecord>>(
        `/buyer-engagement/${propertyId}/interested`,
        {
          budget: criteria.budget,
          bedrooms: criteria.bedrooms,
          minSurfaceArea: criteria.minSurfaceArea,
          pool: criteria.pool,
          minLandArea: criteria.minLandArea ?? null,
        },
        token
      )
      .then((res) => res.data),

  checkBatch: (propertyIds: string[], token: string) =>
    api
      .post<
        ApiResponse<{ engagements: Record<string, EngagementRecord> }>
      >('/buyer-engagement/batch/check', { propertyIds }, token)
      .then((res) => res.data.engagements),
};
