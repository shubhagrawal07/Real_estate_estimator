import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { UserIntent, type ProfileType, type IntentType, type Timeline, type SellPreference } from './user-intent.model';

export interface CreateUserIntentRow {
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

export class UserIntentRepo {
  private repository: Repository<UserIntent>;

  constructor() {
    this.repository = AppDataSource.getRepository(UserIntent);
  }

  async create(data: CreateUserIntentRow): Promise<UserIntent> {
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
}
