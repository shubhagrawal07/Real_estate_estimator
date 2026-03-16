import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { SellerAlert } from './seller-alert.model';

export interface CreateSellerAlertData {
  propertyId: string;
  userId: string;
  type: string;
  payload?: Record<string, unknown> | null;
}

export class SellerAlertRepo {
  private repository: Repository<SellerAlert>;

  constructor() {
    this.repository = AppDataSource.getRepository(SellerAlert);
  }

  async create(data: CreateSellerAlertData): Promise<SellerAlert> {
    const alert = this.repository.create({
      ...data,
      read: false,
    });
    const saved = await this.repository.save(alert);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  /** Returns true if an alert of this type exists for the property today (for deduplication). */
  async hasAlertToday(propertyId: string, type: string): Promise<boolean> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const count = await this.repository
      .createQueryBuilder('a')
      .where('a.propertyId = :propertyId', { propertyId })
      .andWhere('a.type = :type', { type })
      .andWhere('a.createdAt >= :start', { start: startOfDay })
      .getCount();
    return count > 0;
  }

  async findByUserId(userId: string): Promise<SellerAlert[]> {
    return this.repository.find({
      where: { userId },
      relations: ['property'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async deleteByIdAndUserId(id: string, userId: string): Promise<boolean> {
    const result = await this.repository.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}
