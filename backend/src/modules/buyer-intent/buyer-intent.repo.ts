import { In } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { BuyerIntent, BuyerIntentType } from './buyer-intent.model';
import type { Repository } from 'typeorm';

export interface BuyerIntentFlags {
  highInterest: boolean;
  alertActive: boolean;
}

export class BuyerIntentRepo {
  private repository: Repository<BuyerIntent>;

  constructor() {
    this.repository = AppDataSource.getRepository(BuyerIntent);
  }

  async upsertIntent(data: {
    userId: string;
    propertyId: string;
    intentType: BuyerIntentType;
    notifSent: boolean;
    budget?: number | null;
    message?: string | null;
  }): Promise<BuyerIntent> {
    const existing = await this.repository.findOne({
      where: {
        userId: data.userId,
        propertyId: data.propertyId,
        intentType: data.intentType,
      },
    });
    if (existing) {
      existing.notifSent = data.notifSent;
      if (data.budget !== undefined) existing.budget = data.budget ?? null;
      if (data.message !== undefined) existing.message = data.message ?? null;
      return this.repository.save(existing);
    }
    const row = this.repository.create({
      userId: data.userId,
      propertyId: data.propertyId,
      intentType: data.intentType,
      notifSent: data.notifSent,
      budget: data.budget ?? null,
      message: data.message ?? null,
    });
    return this.repository.save(row);
  }

  async findFlagsForProperties(
    userId: string,
    propertyIds: string[]
  ): Promise<Record<string, BuyerIntentFlags>> {
    const out: Record<string, BuyerIntentFlags> = {};
    for (const id of propertyIds) {
      out[id] = { highInterest: false, alertActive: false };
    }
    if (propertyIds.length === 0) return out;

    const rows = await this.repository.find({
      where: {
        userId,
        propertyId: In(propertyIds),
        intentType: In([BuyerIntentType.HIGH_INTEREST, BuyerIntentType.ALERT_AVAILABLE]),
      },
    });
    for (const row of rows) {
      const cur = out[row.propertyId] ?? { highInterest: false, alertActive: false };
      if (row.intentType === BuyerIntentType.HIGH_INTEREST) cur.highInterest = true;
      if (row.intentType === BuyerIntentType.ALERT_AVAILABLE) cur.alertActive = true;
      out[row.propertyId] = cur;
    }
    return out;
  }

  /** All intent rows for a property (seller-side aggregation; caller enforces ownership). */
  async findByPropertyId(propertyId: string): Promise<BuyerIntent[]> {
    return this.repository.find({
      where: { propertyId },
      order: { createdAt: 'DESC' },
    });
  }
}
