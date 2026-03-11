import { Repository, In, QueryRunner } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { BuyerEngagement } from './buyer-engagement.model';

export interface CreateBuyerEngagementData {
  userId: string;
  propertyId: string;
  budget: number;
  bedrooms: number;
  surfaceMin: number;
  landArea?: number | null;
  pool: boolean;
}

export class BuyerEngagementRepo {
  private repository: Repository<BuyerEngagement>;

  constructor() {
    this.repository = AppDataSource.getRepository(BuyerEngagement);
  }

  async findByUserAndProperty(
    userId: string,
    propertyId: string
  ): Promise<BuyerEngagement | null> {
    return this.repository.findOne({
      where: { userId, propertyId },
    });
  }

  async findByUserAndPropertyForUpdate(
    userId: string,
    propertyId: string,
    queryRunner: QueryRunner
  ): Promise<BuyerEngagement | null> {
    const repo = queryRunner.manager.getRepository(BuyerEngagement);
    return repo.findOne({
      where: { userId, propertyId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async create(data: CreateBuyerEngagementData): Promise<BuyerEngagement> {
    const { landArea, ...rest } = data;
    const engagement = this.repository.create({
      ...rest,
      landArea: landArea ?? undefined,
      engagementLevel: 1,
      interested: false,
    });
    const saved = await this.repository.save(engagement);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async createWithTransaction(
    data: CreateBuyerEngagementData & { engagementLevel?: number; interested?: boolean },
    queryRunner: QueryRunner
  ): Promise<BuyerEngagement> {
    const repo = queryRunner.manager.getRepository(BuyerEngagement);
    const { landArea, engagementLevel, interested, ...rest } = data;
    const engagement = repo.create({
      ...rest,
      landArea: landArea ?? undefined,
      engagementLevel: engagementLevel ?? 1,
      interested: interested ?? false,
    });
    const saved = await repo.save(engagement);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async incrementEngagementLevel(
    userId: string,
    propertyId: string,
    delta: number,
    queryRunner?: QueryRunner
  ): Promise<BuyerEngagement | null> {
    const qr = queryRunner ?? AppDataSource.createQueryRunner();
    if (!queryRunner) await qr.connect();
    try {
      const result = await qr.query(
        `UPDATE buyer_engagement
         SET engagement_level = engagement_level + $1
         WHERE user_id = $2 AND property_id = $3
         RETURNING *`,
        [delta, userId, propertyId]
      );
      const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows;
      const raw = rows?.[0] as Record<string, unknown> | undefined;
      if (!raw) return null;
      return this.repository.create(
        mapEngagementRowToEntity(raw)
      );
    } finally {
      if (!queryRunner) await qr.release();
    }
  }

  async findByUserAndPropertyIds(
    userId: string,
    propertyIds: string[]
  ): Promise<BuyerEngagement[]> {
    if (propertyIds.length === 0) return [];
    return this.repository.find({
      where: { userId, propertyId: In(propertyIds) },
    });
  }

  async updateInterestedAndLevel(
    userId: string,
    propertyId: string,
    interested: boolean,
    levelDelta: number,
    queryRunner?: QueryRunner
  ): Promise<BuyerEngagement | null> {
    const qr = queryRunner ?? AppDataSource.createQueryRunner();
    if (!queryRunner) await qr.connect();
    try {
      const result = await qr.query(
        `UPDATE buyer_engagement
         SET interested = $1,
             engagement_level = GREATEST(0, engagement_level + $2)
         WHERE user_id = $3 AND property_id = $4
         RETURNING *`,
        [interested, levelDelta, userId, propertyId]
      );
      const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows;
      const raw = rows?.[0] as Record<string, unknown> | undefined;
      if (!raw) return null;
      return this.repository.create(
        mapEngagementRowToEntity(raw)
      );
    } finally {
      if (!queryRunner) await qr.release();
    }
  }

  async updateInterestedLevelAndCriteria(
    userId: string,
    propertyId: string,
    interested: boolean,
    levelDelta: number,
    criteria: { budget: number; bedrooms: number; surfaceMin: number; landArea?: number | null; pool: boolean },
    queryRunner?: QueryRunner
  ): Promise<BuyerEngagement | null> {
    const qr = queryRunner ?? AppDataSource.createQueryRunner();
    if (!queryRunner) await qr.connect();
    try {
      const result = await qr.query(
        `UPDATE buyer_engagement
         SET interested = $1,
             engagement_level = GREATEST(0, engagement_level + $2),
             budget = $5,
             bedrooms = $6,
             surface_min = $7,
             land_area = $8,
             pool = $9
         WHERE user_id = $3 AND property_id = $4
         RETURNING *`,
        [
          interested,
          levelDelta,
          userId,
          propertyId,
          criteria.budget,
          criteria.bedrooms,
          criteria.surfaceMin,
          criteria.landArea ?? null,
          criteria.pool,
        ]
      );
      const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows;
      const raw = rows?.[0] as Record<string, unknown> | undefined;
      if (!raw) return null;
      return this.repository.create(
        mapEngagementRowToEntity(raw)
      );
    } finally {
      if (!queryRunner) await qr.release();
    }
  }

  async updateFinancingStatusAndLevel(
    userId: string,
    propertyId: string,
    financingStatus: string,
    engagementDelta: number
  ): Promise<BuyerEngagement | null> {
    const qr = AppDataSource.createQueryRunner();
    await qr.connect();
    try {
      const result = await qr.query(
        `UPDATE buyer_engagement
         SET financing_status = $1,
             engagement_level = GREATEST(0, engagement_level + $2)
         WHERE user_id = $3 AND property_id = $4
         RETURNING *`,
        [financingStatus, engagementDelta, userId, propertyId]
      );
      const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] })?.rows;
      const raw = rows?.[0] as Record<string, unknown> | undefined;
      if (!raw) return null;
      return this.repository.create(mapEngagementRowToEntity(raw));
    } finally {
      await qr.release();
    }
  }

  async getMaxEngagementLevelByPropertyId(propertyId: string): Promise<number> {
    const q = await this.repository
      .createQueryBuilder('e')
      .select('MAX(e.engagementLevel)', 'maxLevel')
      .where('e.propertyId = :propertyId', { propertyId })
      .getRawOne<{ maxLevel: string | null }>();
    const max = q?.maxLevel != null ? Number(q.maxLevel) : 0;
    return Number.isFinite(max) ? max : 0;
  }
}

function mapEngagementRowToEntity(
  raw: Record<string, unknown>
): Partial<BuyerEngagement> {
  return {
    ...raw,
    engagementLevel:
      (raw.engagement_level as number) ?? (raw.engagementLevel as number),
    surfaceMin: (raw.surface_min as number) ?? (raw.surfaceMin as number),
    landArea: (raw.land_area as number) ?? (raw.landArea as number),
    userId: raw.user_id ?? raw.userId,
    propertyId: raw.property_id ?? raw.propertyId,
    financingStatus: (raw.financing_status as string) ?? (raw.financingStatus as string),
  } as Partial<BuyerEngagement>;
}
