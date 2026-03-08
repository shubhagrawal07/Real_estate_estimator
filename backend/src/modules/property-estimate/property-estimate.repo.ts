import { Repository, In, QueryRunner } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { PropertyEstimate, PropertyStatus, PropertyType, BuildingAge } from './property-estimate.model';
import { ApartmentDetails, OutdoorSpace } from './entities/apartment-details.model';
import { HouseDetails, PoolOption, ExteriorLayoutQuality } from './entities/house-details.model';
import { CreatePropertyEstimateDto } from './property-estimate.service';

export class PropertyEstimateRepo {
  private repository: Repository<PropertyEstimate>;

  constructor() {
    this.repository = AppDataSource.getRepository(PropertyEstimate);
  }

  async create(data: Partial<PropertyEstimate>): Promise<PropertyEstimate> {
    const estimate = this.repository.create(data);
    return this.repository.save(estimate);
  }

  async createWithRelations(data: Partial<PropertyEstimate> & CreatePropertyEstimateDto): Promise<PropertyEstimate> {
    // Extract related entity data
    const {
      doubleLivingRoom,
      openKitchen,
      laundryCellar,
      apartmentElevator,
      apartmentFloor,
      outdoorSpace,
      landSize,
      semiDetached,
      sharedWalls,
      exteriorLayoutQuality,
      poolOption,
      criteriaCalm,
      criteriaBright,
      criteriaNearAmenities,
      criteriaNoVisAvis,
      criteriaWellConnected,
      amenityAirConditioning,
      amenityModernBathroom,
      amenityRecentKitchen,
      amenityFireplace,
      amenityElectricityStandard,
      amenityDoubleTripleGlazing,
      parkingGarage,
      parkingPrivate,
      parkingShared,
      parkingStreet,
      buildingAge,
      ...estimateData
    } = data;

    // Build arrays of codes for JSON columns
    const criteriaCodes: string[] = [];
    if (criteriaCalm) criteriaCodes.push('calm');
    if (criteriaBright) criteriaCodes.push('bright');
    if (criteriaNearAmenities) criteriaCodes.push('near_amenities');
    if (criteriaNoVisAvis) criteriaCodes.push('no_vis_a_vis');
    if (criteriaWellConnected) criteriaCodes.push('well_connected');

    const amenityCodes: string[] = [];
    if (amenityAirConditioning) amenityCodes.push('air_conditioning');
    if (amenityModernBathroom) amenityCodes.push('modern_bathroom');
    if (amenityRecentKitchen) amenityCodes.push('recent_kitchen');
    if (amenityFireplace) amenityCodes.push('fireplace');
    if (amenityElectricityStandard) amenityCodes.push('electricity_standard');
    if (amenityDoubleTripleGlazing) amenityCodes.push('double_triple_glazing');

    const featureCodes: string[] = [];
    if (doubleLivingRoom) featureCodes.push('double_living_room');
    if (openKitchen) featureCodes.push('open_kitchen');
    if (laundryCellar) featureCodes.push('laundry_cellar');

    const parkingCodes: string[] = [];
    if (parkingGarage) parkingCodes.push('garage');
    if (parkingPrivate) parkingCodes.push('private');
    if (parkingShared) parkingCodes.push('shared');
    if (parkingStreet) parkingCodes.push('street');

    // Create the main PropertyEstimate entity with JSON columns
    const estimate = this.repository.create({
      ...estimateData,
      buildingAge: buildingAge,
      criteria: criteriaCodes,
      amenities: amenityCodes,
      features: featureCodes,
      parking: parkingCodes,
    });
    const savedEstimate = await this.repository.save(estimate);

    // Create type-specific details
    if (savedEstimate.type === PropertyType.APARTMENT) {
      const apartmentDetailsRepo = AppDataSource.getRepository(ApartmentDetails);
      const apartmentDetails = apartmentDetailsRepo.create({
        propertyId: savedEstimate.propertyId,
        hasElevator: apartmentElevator || false,
        floorNumber: apartmentFloor || 0,
        outdoorSpace: outdoorSpace || OutdoorSpace.NONE,
      });
      await apartmentDetailsRepo.save(apartmentDetails);
    } else if (savedEstimate.type === PropertyType.HOUSE) {
      const houseDetailsRepo = AppDataSource.getRepository(HouseDetails);
      const houseDetails = houseDetailsRepo.create({
        propertyId: savedEstimate.propertyId,
        landSize: landSize || 100,
        semiDetached: semiDetached || false,
        sharedWalls: sharedWalls ?? (semiDetached ? 1 : 0),
        exteriorLayoutQuality: exteriorLayoutQuality ?? ExteriorLayoutQuality.BASIC,
        poolOption: poolOption || PoolOption.NOT_POSSIBLE,
      });
      await houseDetailsRepo.save(houseDetails);
    }

    // Return the estimate with relations loaded
    const estimateWithRelations = await this.repository.findOne({
      where: { propertyId: savedEstimate.propertyId },
      relations: ['apartmentDetails', 'houseDetails'],
    });
    
    if (!estimateWithRelations) {
      throw new Error('Failed to retrieve created estimate with relations');
    }
    
    return estimateWithRelations;
  }

  async findAll(): Promise<PropertyEstimate[]> {
    return this.repository.find({
      relations: ['apartmentDetails', 'houseDetails'],
      order: { createdDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PropertyEstimate | null> {
    return this.repository.findOne({
      where: { propertyId: id },
      relations: ['apartmentDetails', 'houseDetails'],
    });
  }

  async findByUserId(userId: string): Promise<PropertyEstimate[]> {
    return this.repository.find({
      where: { userId },
      relations: ['apartmentDetails', 'houseDetails'],
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

  async updatePrice(propertyId: string, basePricePerSqM: number, estimatedPrice: number): Promise<PropertyEstimate | null> {
    const estimate = await this.findOne(propertyId);
    if (!estimate) {
      return null;
    }

    estimate.basePricePerSqM = basePricePerSqM;
    estimate.estimatedPrice = estimatedPrice;
    return this.repository.save(estimate);
  }

  async delete(propertyId: string): Promise<boolean> {
    const result = await this.repository.delete({ propertyId });
    return (result.affected ?? 0) > 0;
  }

  async incrementImpressions(
    propertyId: string,
    delta: number,
    queryRunner?: QueryRunner
  ): Promise<void> {
    const qr = queryRunner ?? AppDataSource.createQueryRunner();
    if (!queryRunner) await qr.connect();
    try {
      await qr.query(
        `UPDATE property_estimates
         SET impressions = GREATEST(0, COALESCE(impressions, 0) + $1)
         WHERE "propertyId" = $2`,
        [delta, propertyId]
      );
    } finally {
      if (!queryRunner) await qr.release();
    }
  }
}
