import { api } from './api';
import type {
  CreateUserIntentPayload,
  DvfPreviewResponse,
  UserIntentCreateResponse,
} from '@/types/user-intent';

export const userIntentService = {
  create: (body: CreateUserIntentPayload, token: string) =>
    api.post<UserIntentCreateResponse>('/user-intent', body, token),

  getDvfPreview: (propertyId: string) =>
    api.get<DvfPreviewResponse>(`/user-intent/dvf-preview/${propertyId}`),
};
