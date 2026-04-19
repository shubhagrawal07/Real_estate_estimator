import { FavouritePropertyRepo } from './favourite-property.repo';
import { PropertyEstimateRepo } from '../property-estimate/property-estimate.repo';
import { serializeEstimates } from '../property-estimate/serialize-estimate.util';
import type { PropertyEstimate } from '../property-estimate/property-estimate.model';
import type { FavouriteProperty } from './favourite-property.model';
import { AppError } from '../../utils/AppError';

export class FavouritePropertyService {
  private favouriteRepo: FavouritePropertyRepo;
  private propertyRepo: PropertyEstimateRepo;

  constructor() {
    this.favouriteRepo = new FavouritePropertyRepo();
    this.propertyRepo = new PropertyEstimateRepo();
  }

  async addFavourite(userId: string, propertyId: string): Promise<{
    alreadyExists: boolean;
    favourite?: FavouriteProperty;
  }> {
    const property = await this.propertyRepo.findOne(propertyId);
    if (!property) {
      throw new AppError('Property not found', 404);
    }
    if (property.userId && property.userId === userId) {
      throw new AppError('You cannot add your own property to favorites', 400);
    }
    const existing = await this.favouriteRepo.findByUserAndProperty(userId, propertyId);
    if (existing) {
      return { alreadyExists: true };
    }
    const favourite = await this.favouriteRepo.create(userId, propertyId);
    return { alreadyExists: false, favourite };
  }

  async removeFavourite(userId: string, propertyId: string): Promise<boolean> {
    return this.favouriteRepo.delete(userId, propertyId);
  }

  async getUserFavouritesWithDetails(userId: string): Promise<Record<string, unknown>[]> {
    const favourites = await this.favouriteRepo.findByUserId(userId);
    const propertiesWithDetails = await Promise.all(
      favourites.map(
        async (f): Promise<PropertyEstimate | null> =>
          this.propertyRepo.findOne(f.propertyId)
      )
    );
    const validProperties = propertiesWithDetails.filter(
      (p): p is PropertyEstimate => p !== null
    );
    return serializeEstimates(validProperties);
  }

  async isFavourite(userId: string, propertyId: string): Promise<boolean> {
    return this.favouriteRepo.isFavourite(userId, propertyId);
  }

  async checkBatch(
    userId: string,
    propertyIds: string[]
  ): Promise<Record<string, boolean>> {
    const favourites = await this.favouriteRepo.findByPropertyIds(userId, propertyIds);
    const map: Record<string, boolean> = {};
    for (const id of propertyIds) {
      map[id] = favourites.some((f) => f.propertyId === id);
    }
    return map;
  }
}
