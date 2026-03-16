import { api } from './api';
import type { SellerAlertItem } from '@/types/estimate';

export const sellerAlertService = {
  getAlerts: (token: string) =>
    api.get<SellerAlertItem[]>('/seller-alerts', token),

  markAsRead: (id: string, token: string) =>
    api.patch<unknown>(`/seller-alerts/${id}/read`, {}, token),
};
