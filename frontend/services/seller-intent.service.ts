import { api } from './api';
import type {
  CreateSellerIntentPayload,
  DvfPreviewResponse,
  SellerIntentCreateResponse,
} from '@/types/seller-intent';

export const sellerIntentService = {
  create: (body: CreateSellerIntentPayload, token: string) =>
    api.post<SellerIntentCreateResponse>('/seller-intent', body, token),

  getDvfPreview: (propertyId: string) =>
    api.get<DvfPreviewResponse>(`/seller-intent/dvf-preview/${propertyId}`),
};
