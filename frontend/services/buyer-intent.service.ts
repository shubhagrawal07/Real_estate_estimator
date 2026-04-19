import { api } from './api';
import type {
  BuyerIntentFlags,
  BuyerIntentRecord,
  CreateBuyerIntentPayload,
} from '@/types/buyer-intent';

export const buyerIntentService = {
  async create(payload: CreateBuyerIntentPayload, token: string): Promise<BuyerIntentRecord> {
    const res = await api.post<{ success: boolean; data: BuyerIntentRecord }>(
      '/buyer-intent',
      payload,
      token
    );
    return res.data;
  },

  async batchFlags(
    propertyIds: string[],
    token: string
  ): Promise<Record<string, BuyerIntentFlags>> {
    const res = await api.post<{ success: boolean; data: Record<string, BuyerIntentFlags> }>(
      '/buyer-intent/batch',
      { propertyIds },
      token
    );
    return res.data ?? {};
  },
};
