import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { PropertyEstimate, PropertyStatus, PropertyType, BuildingAge } from './property-estimate.model';
import { ApartmentDetails, OutdoorSpace } from './entities/apartment-details.model';
import { HouseDetails, PoolOption } from './entities/house-details.model';
import { PropertyCriteria } from './entities/property-criteria.model';
import { PropertyAmenity } from './entities/property-amenity.model';
import { PropertyParking } from './entities/property-parking.model';
import { PropertyFeature } from './entities/property-feature.model';
import { Criteria } from './entities/criteria.model';
import { Amenity } from './entities/amenity.model';
import { ParkingType } from './entities/parking-type.model';
import { Feature } from './entities/feature.model';
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

    // Create the main PropertyEstimate entity
    const estimate = this.repository.create({
      ...estimateData,
      buildingAge: buildingAge,
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
        poolOption: poolOption || PoolOption.NOT_POSSIBLE,
      });
      await houseDetailsRepo.save(houseDetails);
    }

    // Create PropertyCriteria entries
    const criteriaRepo = AppDataSource.getRepository(Criteria);
    const propertyCriteriaRepo = AppDataSource.getRepository(PropertyCriteria);
    const criteriaMapping: { [key: string]: string } = {
      criteriaCalm: 'calm',
      criteriaBright: 'bright',
      criteriaNearAmenities: 'near_amenities',
      criteriaNoVisAvis: 'no_vis_a_vis',
      criteriaWellConnected: 'well_connected',
    };

    for (const [field, code] of Object.entries(criteriaMapping)) {
      if (data[field as keyof CreatePropertyEstimateDto]) {
        const criteria = await criteriaRepo.findOne({ where: { code } });
        if (criteria) {
          const propertyCriteria = propertyCriteriaRepo.create({
            propertyId: savedEstimate.propertyId,
            criteriaId: criteria.id,
          });
          await propertyCriteriaRepo.save(propertyCriteria);
        }
      }
    }

    // Create PropertyAmenity entries
    const amenityRepo = AppDataSource.getRepository(Amenity);
    const propertyAmenityRepo = AppDataSource.getRepository(PropertyAmenity);
    const amenityMapping: { [key: string]: string } = {
      amenityAirConditioning: 'air_conditioning',
      amenityModernBathroom: 'modern_bathroom',
      amenityRecentKitchen: 'recent_kitchen',
      amenityFireplace: 'fireplace',
      amenityElectricityStandard: 'electricity_standard',
      amenityDoubleTripleGlazing: 'double_triple_glazing',
    };

    for (const [field, code] of Object.entries(amenityMapping)) {
      if (data[field as keyof CreatePropertyEstimateDto]) {
        const amenity = await amenityRepo.findOne({ where: { code } });
        if (amenity) {
          const propertyAmenity = propertyAmenityRepo.create({
            propertyId: savedEstimate.propertyId,
            amenityId: amenity.id,
          });
          await propertyAmenityRepo.save(propertyAmenity);
        }
      }
    }

    // Create PropertyParking entries
    const parkingTypeRepo = AppDataSource.getRepository(ParkingType);
    const propertyParkingRepo = AppDataSource.getRepository(PropertyParking);
    const parkingMapping: { [key: string]: string } = {
      parkingGarage: 'garage',
      parkingPrivate: 'private',
      parkingShared: 'shared',
      parkingStreet: 'street',
    };

    for (const [field, code] of Object.entries(parkingMapping)) {
      if (data[field as keyof CreatePropertyEstimateDto]) {
        const parkingType = await parkingTypeRepo.findOne({ where: { code } });
        if (parkingType) {
          const propertyParking = propertyParkingRepo.create({
            propertyId: savedEstimate.propertyId,
            parkingTypeId: parkingType.id,
          });
          await propertyParkingRepo.save(propertyParking);
        }
      }
    }

    // Create PropertyFeature entries
    const featureRepo = AppDataSource.getRepository(Feature);
    const propertyFeatureRepo = AppDataSource.getRepository(PropertyFeature);
    const featureMapping: { [key: string]: string } = {
      doubleLivingRoom: 'double_living_room',
      openKitchen: 'open_kitchen',
      laundryCellar: 'laundry_cellar',
    };

    for (const [field, code] of Object.entries(featureMapping)) {
      if (data[field as keyof CreatePropertyEstimateDto]) {
        const feature = await featureRepo.findOne({ where: { code } });
        if (feature) {
          const propertyFeature = propertyFeatureRepo.create({
            propertyId: savedEstimate.propertyId,
            featureId: feature.id,
          });
          await propertyFeatureRepo.save(propertyFeature);
        }
      }
    }

    // Return the estimate with relations loaded
    const estimateWithRelations = await this.repository.findOne({
      where: { propertyId: savedEstimate.propertyId },
      relations: ['apartmentDetails', 'houseDetails', 'propertyCriteria', 'propertyAmenities', 'propertyParking', 'propertyFeatures'],
    });
    
    if (!estimateWithRelations) {
      throw new Error('Failed to retrieve created estimate with relations');
    }
    
    return estimateWithRelations;
  }

  async findAll(): Promise<PropertyEstimate[]> {
    return this.repository.find({
      relations: ['apartmentDetails', 'houseDetails', 'propertyCriteria', 'propertyAmenities', 'propertyParking', 'propertyFeatures'],
      order: { createdDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PropertyEstimate | null> {
    return this.repository.findOne({
      where: { propertyId: id },
      relations: ['apartmentDetails', 'houseDetails', 'propertyCriteria', 'propertyAmenities', 'propertyParking', 'propertyFeatures'],
    });
  }

  async findByUserId(userId: string): Promise<PropertyEstimate[]> {
    return this.repository.find({
      where: { userId },
      relations: ['apartmentDetails', 'houseDetails', 'propertyCriteria', 'propertyAmenities', 'propertyParking', 'propertyFeatures'],
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

  async delete(propertyId: string): Promise<boolean> {
    const result = await this.repository.delete({ propertyId });
    return (result.affected ?? 0) > 0;
  }
}
