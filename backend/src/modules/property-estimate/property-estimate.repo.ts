import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { PropertyEstimate, PropertyStatus } from './property-estimate.model';

export class PropertyEstimateRepo {
  private repository: Repository<PropertyEstimate>;

  constructor() {
    this.repository = AppDataSource.getRepository(PropertyEstimate);
  }

  async create(data: Partial<PropertyEstimate>): Promise<PropertyEstimate> {
    const estimate = this.repository.create(data);
    return this.repository.save(estimate);
  }

  async findAll(): Promise<PropertyEstimate[]> {
    return this.repository.find({
      order: { createdDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PropertyEstimate | null> {
    return this.repository.findOne({ where: { propertyId: id } });
  }

  async findByUserId(userId: string): Promise<PropertyEstimate[]> {
    return this.repository.find({
      where: { userId },
      order: { createdDate: 'DESC' },
    });
  }

  async findDraftEstimates(): Promise<PropertyEstimate[]> {
    return this.repository.find({
      where: { status: PropertyStatus.DRAFT },
      order: { createdDate: 'DESC' },
    });
  }

  async updateStatus(propertyId: string, status: PropertyStatus, userId?: string): Promise<PropertyEstimate | null> {
    const estimate = await this.findOne(propertyId);
    if (!estimate) {
      return null;
    }

    estimate.status = status;
    if (userId) {
      estimate.userId = userId;
    }

    return this.repository.save(estimate);
  }

  async linkDraftEstimatesToUser(draftPropertyIds: string[], userId: string): Promise<PropertyEstimate[]> {
    const estimates = await this.repository.find({
      where: { propertyId: In(draftPropertyIds) },
    });
    const updatedEstimates: PropertyEstimate[] = [];

    for (const estimate of estimates) {
      if (estimate.status === PropertyStatus.DRAFT && !estimate.userId) {
        estimate.userId = userId;
        estimate.status = PropertyStatus.NEW;
        updatedEstimates.push(await this.repository.save(estimate));
      }
    }

    return updatedEstimates;
  }

  async updateEstimatedPrice(propertyId: string, estimatedPrice: number): Promise<PropertyEstimate | null> {
    const estimate = await this.findOne(propertyId);
    if (!estimate) {
      return null;
    }

    estimate.estimatedPrice = estimatedPrice;
    return this.repository.save(estimate);
  }
}
