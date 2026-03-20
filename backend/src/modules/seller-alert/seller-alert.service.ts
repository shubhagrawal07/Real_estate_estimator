import { SellerAlertRepo } from './seller-alert.repo';
import { SellerAlert, SELLER_ALERT_TYPE_BUYER_ABOVE_TRIGGER } from './seller-alert.model';
import type { PropertyEstimate } from '../property-estimate/property-estimate.model';

export interface SellerAlertListItem {
  id: string;
  type: string;
  propertyId: string;
  address?: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  read: boolean;
}

export class SellerAlertService {
  private repo: SellerAlertRepo;

  constructor() {
    this.repo = new SellerAlertRepo();
  }

  /** Creates at most one buyer-above-trigger alert per property per day. */
  async createBuyerAboveTriggerAlertIfNew(
    propertyId: string,
    userId: string,
    budget: number
  ): Promise<void> {
    const already = await this.repo.hasAlertToday(
      propertyId,
      SELLER_ALERT_TYPE_BUYER_ABOVE_TRIGGER
    );
    if (already) return;
    await this.repo.create({
      propertyId,
      userId,
      type: SELLER_ALERT_TYPE_BUYER_ABOVE_TRIGGER,
      payload: { budget, createdAt: new Date().toISOString() },
    });
  }

  async listForUser(userId: string): Promise<SellerAlertListItem[]> {
    const alerts = await this.repo.findByUserId(userId);
    return alerts.map((a) => {
      const property = (a as SellerAlert & { property?: PropertyEstimate }).property;
      return {
        id: a.id,
        type: a.type,
        propertyId: a.propertyId,
        address: property?.address,
        payload: a.payload,
        createdAt: (a.createdAt as Date).toISOString?.() ?? String(a.createdAt),
        read: a.read,
      };
    });
  }

  async markAsReadAndDelete(id: string, userId: string): Promise<boolean> {
    return this.repo.deleteByIdAndUserId(id, userId);
  }
}
