import { api } from './api';
import type { PropertyEstimateResponse } from '@/types/estimate';

export interface BatchFavouritesResponse {
  favourites: Record<string, boolean>;
}

export const favouritePropertyService = {
  add: (propertyId: string, token: string) =>
    api.post<{ message: string; isFavourite: boolean; favourite?: unknown }>(
      `/favourite-property/${propertyId}`,
      {},
      token
    ),

  remove: (propertyId: string, token: string) =>
    api.delete<{ message: string; isFavourite: boolean }>(
      `/favourite-property/${propertyId}`,
      token
    ),

  getUserFavourites: (token: string) =>
    api.get<PropertyEstimateResponse[]>('/favourite-property/user/favourites', token),

  check: (propertyId: string, token: string) =>
    api.get<{ isFavourite: boolean }>(`/favourite-property/${propertyId}`, token),

  checkBatch: (propertyIds: string[], token: string) =>
    api.post<BatchFavouritesResponse>(
      '/favourite-property/batch/check',
      { propertyIds },
      token
    ),
};
