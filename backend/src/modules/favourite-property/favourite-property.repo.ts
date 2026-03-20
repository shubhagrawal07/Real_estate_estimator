import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { FavouriteProperty } from './favourite-property.model';

export class FavouritePropertyRepo {
  private repository: Repository<FavouriteProperty>;

  constructor() {
    this.repository = AppDataSource.getRepository(FavouriteProperty);
  }

  async create(userId: string, propertyId: string): Promise<FavouriteProperty> {
    const favourite = this.repository.create({
      userId,
      propertyId,
    });
    return this.repository.save(favourite);
  }

  async findByUserAndProperty(userId: string, propertyId: string): Promise<FavouriteProperty | null> {
    return this.repository.findOne({
      where: { userId, propertyId },
    });
  }

  async findByUserId(userId: string): Promise<FavouriteProperty[]> {
    return this.repository.find({
      where: { userId },
      relations: ['property'],
    });
  }

  async findByPropertyIds(userId: string, propertyIds: string[]): Promise<FavouriteProperty[]> {
    if (propertyIds.length === 0) return [];
    return this.repository.find({
      where: {
        userId,
        propertyId: In(propertyIds),
      },
    });
  }

  async delete(userId: string, propertyId: string): Promise<boolean> {
    const result = await this.repository.delete({ userId, propertyId });
    return (result.affected ?? 0) > 0;
  }

  async isFavourite(userId: string, propertyId: string): Promise<boolean> {
    const favourite = await this.findByUserAndProperty(userId, propertyId);
    return favourite !== null;
  }
}

