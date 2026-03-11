import { AppDataSource } from '../../config/db';
import { BuyerEngagementRepo } from './buyer-engagement.repo';
import { PropertyEstimateRepo } from '../property-estimate/property-estimate.repo';
import { AppError } from '../../utils/AppError';

export interface EngagementCriteria {
  budget: number;
  bedrooms: number;
  minSurfaceArea: number;
  pool?: boolean;
  minLandArea?: number | null;
}

export interface EngagementRecord {
  engagementLevel: number;
  interested: boolean;
}

export class BuyerEngagementService {
  private engagementRepo: BuyerEngagementRepo;
  private propertyRepo: PropertyEstimateRepo;

  constructor() {
    this.engagementRepo = new BuyerEngagementRepo();
    this.propertyRepo = new PropertyEstimateRepo();
  }

  async recordClick(
    userId: string,
    propertyId: string,
    criteria: EngagementCriteria
  ): Promise<EngagementRecord> {
    const existing = await this.engagementRepo.findByUserAndProperty(
      userId,
      propertyId
    );
    if (existing) {
      const updated = await this.engagementRepo.incrementEngagementLevel(
        userId,
        propertyId,
        1
      );
      if (!updated) {
        throw new AppError('Failed to update engagement', 500);
      }
      return {
        engagementLevel: updated.engagementLevel,
        interested: updated.interested,
      };
    }
    const created = await this.engagementRepo.create({
      userId,
      propertyId,
      budget: criteria.budget,
      bedrooms: criteria.bedrooms,
      surfaceMin: criteria.minSurfaceArea,
      landArea: criteria.minLandArea ?? null,
      pool: criteria.pool ?? false,
    });
    return {
      engagementLevel: created.engagementLevel,
      interested: created.interested,
    };
  }

  async toggleInterested(
    userId: string,
    propertyId: string,
    criteria: EngagementCriteria
  ): Promise<EngagementRecord> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const criteriaPayload = {
      budget: criteria.budget,
      bedrooms: criteria.bedrooms,
      surfaceMin: criteria.minSurfaceArea,
      landArea: criteria.minLandArea ?? null,
      pool: criteria.pool ?? false,
    };

    try {
      const existing = await this.engagementRepo.findByUserAndPropertyForUpdate(
        userId,
        propertyId,
        queryRunner
      );

      if (!existing) {
        const created = await this.engagementRepo.createWithTransaction(
          {
            userId,
            propertyId,
            ...criteriaPayload,
            engagementLevel: 11,
            interested: true,
          },
          queryRunner
        );
        await this.propertyRepo.incrementImpressions(
          propertyId,
          1,
          queryRunner
        );
        await queryRunner.commitTransaction();
        return {
          engagementLevel: created.engagementLevel,
          interested: created.interested,
        };
      }

      const newInterested = !existing.interested;
      const levelDelta = newInterested ? 10 : -10;

      const updated = await this.engagementRepo.updateInterestedLevelAndCriteria(
        userId,
        propertyId,
        newInterested,
        levelDelta,
        criteriaPayload,
        queryRunner
      );
      if (!updated) {
        await queryRunner.rollbackTransaction();
        throw new AppError('Failed to update engagement', 500);
      }
      await this.propertyRepo.incrementImpressions(
        propertyId,
        newInterested ? 1 : -1,
        queryRunner
      );
      await queryRunner.commitTransaction();
      return {
        engagementLevel: updated.engagementLevel,
        interested: updated.interested,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getBatch(
    userId: string,
    propertyIds: string[]
  ): Promise<Record<string, EngagementRecord>> {
    const engagements = await this.engagementRepo.findByUserAndPropertyIds(
      userId,
      propertyIds
    );
    const result: Record<string, EngagementRecord> = {};
    for (const id of propertyIds) {
      result[id] = {
        engagementLevel: 0,
        interested: false,
      };
    }
    for (const e of engagements) {
      result[e.propertyId] = {
        engagementLevel: e.engagementLevel,
        interested: e.interested,
      };
    }
    return result;
  }

  async updateFinancingStatus(
    userId: string,
    propertyId: string,
    financingStatus: string,
    engagementDelta: number
  ): Promise<EngagementRecord> {
    const updated = await this.engagementRepo.updateFinancingStatusAndLevel(
      userId,
      propertyId,
      financingStatus,
      engagementDelta
    );
    if (!updated) {
      throw new AppError('Engagement record not found', 404);
    }
    return {
      engagementLevel: updated.engagementLevel,
      interested: updated.interested,
    };
  }
}
