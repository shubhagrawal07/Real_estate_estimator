import { PropertyEstimateRepo } from './property-estimate.repo';
import {
  PropertyEstimate,
  PropertyType,
  OwnershipType,
  Deadline,
  PropertyStatus,
  BuildingAge,
} from './property-estimate.model';
import { AppDataSource } from '../../config/db';
import { ApartmentDetails, OutdoorSpace } from './entities/apartment-details.model';
import { HouseDetails, PoolOption } from './entities/house-details.model';
import { Criteria } from './entities/criteria.model';
import { Amenity } from './entities/amenity.model';
import { ParkingType } from './entities/parking-type.model';
import { Feature } from './entities/feature.model';
import { PropertyCriteria } from './entities/property-criteria.model';
import { PropertyAmenity } from './entities/property-amenity.model';
import { PropertyParking } from './entities/property-parking.model';
import { PropertyFeature } from './entities/property-feature.model';

export interface CreatePropertyEstimateDto {
  address: string;
  postalCode: number;
  department: string;
  municipality: string;
  cadastralSection: string;
  buildingAge: BuildingAge;
  type: PropertyType;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  hasBalcony: boolean;
  hasParking: boolean;
  doubleLivingRoom: boolean;
  openKitchen: boolean;
  laundryCellar: boolean;
  apartmentElevator?: boolean | null;
  apartmentFloor?: number | null;
  outdoorSpace: OutdoorSpace;
  landSize?: number | null;
  semiDetached?: boolean | null;
  poolOption: PoolOption;
  criteriaCalm: boolean;
  criteriaBright: boolean;
  criteriaNearAmenities: boolean;
  criteriaNoVisAvis: boolean;
  criteriaWellConnected: boolean;
  amenityAirConditioning: boolean;
  amenityModernBathroom: boolean;
  amenityRecentKitchen: boolean;
  amenityFireplace: boolean;
  parkingGarage: boolean;
  parkingPrivate: boolean;
  parkingShared: boolean;
  parkingStreet: boolean;
  ownershipType: OwnershipType;
  deadline: Deadline;
  condition?: string;
}

export class PropertyEstimateService {
  private repo: PropertyEstimateRepo;

  constructor() {
    this.repo = new PropertyEstimateRepo();
  }

  async createEstimate(dto: CreatePropertyEstimateDto): Promise<PropertyEstimate> {
    // Get repositories for junction tables
    const criteriaRepo = AppDataSource.getRepository(Criteria);
    const amenityRepo = AppDataSource.getRepository(Amenity);
    const parkingTypeRepo = AppDataSource.getRepository(ParkingType);
    const featureRepo = AppDataSource.getRepository(Feature);
    const propertyCriteriaRepo = AppDataSource.getRepository(PropertyCriteria);
    const propertyAmenityRepo = AppDataSource.getRepository(PropertyAmenity);
    const propertyParkingRepo = AppDataSource.getRepository(PropertyParking);
    const propertyFeatureRepo = AppDataSource.getRepository(PropertyFeature);

    // Calculate price including normalized data impact
    const estimatedPrice = await this.calculatePriceWithRelations(dto, criteriaRepo, amenityRepo, parkingTypeRepo, featureRepo);

    // Create property estimate without the boolean fields
    const { 
      criteriaCalm, criteriaBright, criteriaNearAmenities, criteriaNoVisAvis, criteriaWellConnected,
      amenityAirConditioning, amenityModernBathroom, amenityRecentKitchen, amenityFireplace,
      parkingGarage, parkingPrivate, parkingShared, parkingStreet,
      doubleLivingRoom, openKitchen, laundryCellar,
      ...propertyData 
    } = dto;

    const property = await this.repo.create({
      ...propertyData,
      estimatedPrice,
      impressions: 0,
      status: PropertyStatus.NEW,
    });

    // Create type-specific details based on property type
    if (dto.type === PropertyType.APARTMENT) {
      const apartmentDetailsRepo = AppDataSource.getRepository(ApartmentDetails);
      await apartmentDetailsRepo.save({
        propertyId: property.propertyId,
        hasElevator: dto.apartmentElevator ?? false,
        floorNumber: dto.apartmentFloor ?? 0,
        outdoorSpace: dto.outdoorSpace ?? OutdoorSpace.NONE,
      });
    } else if (dto.type === PropertyType.HOUSE) {
      const houseDetailsRepo = AppDataSource.getRepository(HouseDetails);
      await houseDetailsRepo.save({
        propertyId: property.propertyId,
        landSize: dto.landSize ?? 100,
        semiDetached: dto.semiDetached ?? false,
        poolOption: dto.poolOption ?? PoolOption.NOT_POSSIBLE,
      });
    }

    // Create relationships for criteria
    const criteriaMap: { [key: string]: boolean } = {
      calm: criteriaCalm,
      bright: criteriaBright,
      near_amenities: criteriaNearAmenities,
      no_vis_a_vis: criteriaNoVisAvis,
      well_connected: criteriaWellConnected,
    };

    for (const [code, isSelected] of Object.entries(criteriaMap)) {
      if (isSelected) {
        const criteria = await criteriaRepo.findOne({ where: { code } });
        if (criteria) {
          await propertyCriteriaRepo.save({
            propertyId: property.propertyId,
            criteriaId: criteria.id,
          });
        }
      }
    }

    // Create relationships for amenities
    const amenityMap: { [key: string]: boolean } = {
      air_conditioning: amenityAirConditioning,
      modern_bathroom: amenityModernBathroom,
      recent_kitchen: amenityRecentKitchen,
      fireplace: amenityFireplace,
    };

    for (const [code, isSelected] of Object.entries(amenityMap)) {
      if (isSelected) {
        const amenity = await amenityRepo.findOne({ where: { code } });
        if (amenity) {
          await propertyAmenityRepo.save({
            propertyId: property.propertyId,
            amenityId: amenity.id,
          });
        }
      }
    }

    // Create relationships for parking
    const parkingMap: { [key: string]: boolean } = {
      garage: parkingGarage,
      private: parkingPrivate,
      shared: parkingShared,
      street: parkingStreet,
    };

    for (const [code, isSelected] of Object.entries(parkingMap)) {
      if (isSelected) {
        const parkingType = await parkingTypeRepo.findOne({ where: { code } });
        if (parkingType) {
          await propertyParkingRepo.save({
            propertyId: property.propertyId,
            parkingTypeId: parkingType.id,
          });
        }
      }
    }

    // Create relationships for features (quick features)
    const featureMap: { [key: string]: boolean } = {
      double_living_room: doubleLivingRoom,
      open_kitchen: openKitchen,
      laundry_cellar: laundryCellar,
    };

    for (const [code, isSelected] of Object.entries(featureMap)) {
      if (isSelected) {
        const feature = await featureRepo.findOne({ where: { code } });
        if (feature) {
          await propertyFeatureRepo.save({
            propertyId: property.propertyId,
            featureId: feature.id,
          });
        }
      }
    }

    return property;
  }

  private async calculatePriceWithRelations(
    dto: CreatePropertyEstimateDto,
    criteriaRepo: any,
    amenityRepo: any,
    parkingTypeRepo: any,
    featureRepo: any
  ): Promise<number> {
    let basePrice = this.calculateBasePrice(dto);

    // Add criteria impacts
    const criteriaMap: { [key: string]: boolean } = {
      calm: dto.criteriaCalm,
      bright: dto.criteriaBright,
      near_amenities: dto.criteriaNearAmenities,
      no_vis_a_vis: dto.criteriaNoVisAvis,
      well_connected: dto.criteriaWellConnected,
    };

    for (const [code, isSelected] of Object.entries(criteriaMap)) {
      if (isSelected) {
        const criteria = await criteriaRepo.findOne({ where: { code } });
        if (criteria) {
          basePrice *= (1 + criteria.priceImpact / 100);
        }
      }
    }

    // Add amenity impacts
    const amenityMap: { [key: string]: boolean } = {
      air_conditioning: dto.amenityAirConditioning,
      modern_bathroom: dto.amenityModernBathroom,
      recent_kitchen: dto.amenityRecentKitchen,
      fireplace: dto.amenityFireplace,
    };

    for (const [code, isSelected] of Object.entries(amenityMap)) {
      if (isSelected) {
        const amenity = await amenityRepo.findOne({ where: { code } });
        if (amenity) {
          basePrice *= (1 + amenity.priceImpact / 100);
        }
      }
    }

    // Add parking impacts (take the highest one, not cumulative)
    const parkingMap: { [key: string]: boolean } = {
      garage: dto.parkingGarage,
      private: dto.parkingPrivate,
      shared: dto.parkingShared,
      street: dto.parkingStreet,
    };

    let highestParkingImpact = 0;
    for (const [code, isSelected] of Object.entries(parkingMap)) {
      if (isSelected) {
        const parkingType = await parkingTypeRepo.findOne({ where: { code } });
        if (parkingType && parkingType.priceImpact > highestParkingImpact) {
          highestParkingImpact = parkingType.priceImpact;
        }
      }
    }

    if (highestParkingImpact > 0) {
      basePrice *= (1 + highestParkingImpact / 100);
    }

    // Add feature impacts
    const featureMap: { [key: string]: boolean } = {
      double_living_room: dto.doubleLivingRoom,
      open_kitchen: dto.openKitchen,
      laundry_cellar: dto.laundryCellar,
    };

    for (const [code, isSelected] of Object.entries(featureMap)) {
      if (isSelected) {
        const feature = await featureRepo.findOne({ where: { code } });
        if (feature) {
          basePrice *= (1 + feature.priceImpact / 100);
        }
      }
    }

    return Math.round(basePrice);
  }

  private calculateBasePrice(dto: CreatePropertyEstimateDto): number {
    let basePricePerSqM = 2000; // Base price per square meter

    // Department/municipality multiplier (location-based pricing)
    const locationMultiplier = this.getLocationMultiplier(dto.department, dto.municipality);
    basePricePerSqM *= locationMultiplier;

    // Property type multiplier
    const typeMultiplier = dto.type === PropertyType.HOUSE ? 1.2 : 1.0;
    basePricePerSqM *= typeMultiplier;

    // Bedroom multiplier
    const bedroomMultiplier = 1 + (dto.bedrooms - 2) * 0.1;
    
    // Bathroom multiplier
    const bathroomMultiplier = 1 + (dto.bathrooms - 1.5) * 0.15;

    // Floor multiplier (more floors can add value)
    const floorMultiplier = 1 + (dto.floors - 1) * 0.05;

    // Feature multipliers
    const balconyMultiplier = dto.hasBalcony ? 1.1 : 1.0;
    const parkingMultiplier = dto.hasParking ? 1.15 : 1.0;

    // Ownership and deadline multipliers
    const ownershipMultiplier = dto.ownershipType === OwnershipType.OWNER ? 1.0 : 0.95;
    const deadlineMultiplier = dto.deadline === Deadline.IMMEDIATE ? 0.98 : 1.0;

    // Condition multiplier
    const conditionMultiplier = this.getConditionMultiplier(dto.condition);

    const estimatedPrice =
      dto.area *
      basePricePerSqM *
      bedroomMultiplier *
      bathroomMultiplier *
      floorMultiplier *
      balconyMultiplier *
      parkingMultiplier *
      ownershipMultiplier *
      deadlineMultiplier *
      conditionMultiplier;

    return Math.round(estimatedPrice);
  }

  private getLocationMultiplier(department: string, municipality: string): number {
    // Simplified location-based pricing
    // In a real application, this would use more sophisticated location data
    const locationMultipliers: { [key: string]: number } = {
      'Paris': 2.5,
      'Lyon': 1.8,
      'Marseille': 1.6,
      'Toulouse': 1.4,
      'Nice': 1.9,
      'Nantes': 1.5,
      'Strasbourg': 1.3,
      'Montpellier': 1.4,
      'Bordeaux': 1.6,
      'Lille': 1.2,
    };

    return locationMultipliers[municipality] || locationMultipliers[department] || 1.0;
  }

  private getConditionMultiplier(condition?: string): number {
    if (!condition) return 1.0;
    
    const conditionMultipliers: { [key: string]: number } = {
      'excellent': 1.2,
      'good': 1.0,
      'fair': 0.85,
      'poor': 0.7,
      'needs renovation': 0.6,
    };

    return conditionMultipliers[condition.toLowerCase()] || 1.0;
  }

  async findAll(): Promise<PropertyEstimate[]> {
    return this.repo.findAll();
  }

  async findOne(id: string): Promise<PropertyEstimate | null> {
    return this.repo.findOneWithRelations(id);
  }
}
