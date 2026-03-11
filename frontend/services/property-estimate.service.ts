import { api } from './api';
import type {
  PropertyEstimateResponse,
  UpdateEngagementBody,
  BuyerInterestResponse,
} from '@/types/estimate';

export const propertyEstimateService = {
  create: (body: unknown, token?: string | null) =>
    api.post<PropertyEstimateResponse>('/property-estimate', body, token),

  getMyEstimates: (token: string) =>
    api.get<PropertyEstimateResponse[]>('/property-estimate/user/my-estimates', token),

  getById: (id: string) =>
    api.get<PropertyEstimateResponse>(`/property-estimate/${id}`),

  linkDrafts: (propertyIds: string[], token: string) =>
    api.post<{ message: string; estimates: PropertyEstimateResponse[] }>(
      '/property-estimate/link-drafts',
      { propertyIds },
      token
    ),

  recalculate: (id: string) =>
    api.put<PropertyEstimateResponse>(`/property-estimate/${id}/recalculate`, {}, undefined),

  delete: (id: string, token: string) =>
    api.delete<{ message: string }>(`/property-estimate/${id}`, token),

  updateEngagement: (
    propertyId: string,
    body: UpdateEngagementBody,
    token: string
  ) =>
    api.patch<PropertyEstimateResponse>(
      `/property-estimate/${propertyId}/engagement`,
      body,
      token
    ),

  getBuyerInterest: (propertyId: string, token: string) =>
    api.get<BuyerInterestResponse>(
      `/property-estimate/${propertyId}/buyer-interest`,
      token
    ),
};
