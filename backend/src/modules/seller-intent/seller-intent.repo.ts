import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/db';
import {
  SellerIntent,
  type ProfileType,
  type IntentType,
  type Timeline,
  type SellPreference,
} from './seller-intent.model';

export interface CreateSellerIntentRow {
  userId: string;
  propertyId: string;
  profileType: ProfileType;
  intentType?: IntentType | null;
  targetPrice?: number | null;
  timeline?: Timeline | null;
  sellPreference?: SellPreference | null;
  agentId?: string | null;
  notifSent: boolean;
}

export class SellerIntentRepo {
  private repository: Repository<SellerIntent>;

  constructor() {
    this.repository = AppDataSource.getRepository(SellerIntent);
  }

  async create(data: CreateSellerIntentRow): Promise<SellerIntent> {
    const row = this.repository.create({
      userId: data.userId,
      propertyId: data.propertyId,
      profileType: data.profileType,
      intentType: data.intentType ?? null,
      targetPrice: data.targetPrice ?? null,
      timeline: data.timeline ?? null,
      sellPreference: data.sellPreference ?? null,
      agentId: data.agentId ?? null,
      notifSent: data.notifSent,
    });
    return this.repository.save(row);
  }

  /**
   * Latest seller intent row for this property with a non-null target price (owner-only intents).
   */
  async findLatestWithTargetPriceForOwner(
    propertyId: string,
    ownerUserId: string
  ): Promise<SellerIntent | null> {
    return this.repository
      .createQueryBuilder('si')
      .where('si.propertyId = :propertyId', { propertyId })
      .andWhere('si.userId = :ownerUserId', { ownerUserId })
      .andWhere('si.targetPrice IS NOT NULL')
      .orderBy('si.createdAt', 'DESC')
      .limit(1)
      .getOne();
  }
}
