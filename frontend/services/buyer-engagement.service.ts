import { api } from './api';
import type {
  BuyerSearchCriteria,
  EngagementRecord,
  FinancingStatus,
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
      .then((res) => (res as ApiResponse<EngagementRecord>).data),

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
      .then((res) => (res as ApiResponse<EngagementRecord>).data),

  checkBatch: (propertyIds: string[], token: string) =>
    api
      .post<
        ApiResponse<{ engagements: Record<string, EngagementRecord> }>
      >('/buyer-engagement/batch/check', { propertyIds }, token)
      .then((res) => (res as ApiResponse<{ engagements: Record<string, EngagementRecord> }>).data.engagements),

  updateFinancingStatus: (
    propertyId: string,
    financingStatus: FinancingStatus,
    engagementDelta: number,
    token: string
  ) =>
    api
      .patch<ApiResponse<EngagementRecord>>(
        `/buyer-engagement/${propertyId}/financing-status`,
        { financingStatus, engagementDelta },
        token
      )
      .then((res) => (res as ApiResponse<EngagementRecord>).data),

  resetEngagement: (propertyId: string, token: string) =>
    api
      .patch<ApiResponse<EngagementRecord>>(
        `/buyer-engagement/${propertyId}/reset-engagement`,
        {},
        token
      )
      .then((res) => (res as ApiResponse<EngagementRecord>).data),
};
