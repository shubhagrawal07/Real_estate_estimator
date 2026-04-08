import { PropertyEstimateRepo } from './property-estimate.repo';
import { BuyerEngagementRepo, type PotentialBuyerRow } from '../buyer-engagement/buyer-engagement.repo';
import {
  PropertyEstimate,
  PropertyType,
  OwnershipType,
  Deadline,
  PropertyStatus,
  BuildingAge,
} from './property-estimate.model';
import { CityBlockSalesDataRepo } from '../city-block-sales-data/city-block-sales-data.repo';
import { OutdoorSpace } from './entities/apartment-details.model';
import { PoolOption, ExteriorLayoutQuality } from './entities/house-details.model';
import { PropertyEstimateValuationService } from './property-estimate-valuation.service';
import { AppError } from '../../utils/AppError';

export interface CreatePropertyEstimateDto {
  address: string;
  locationCode: string;
  longitude?: number;
  latitude?: number;
  buildingAge: BuildingAge;
  type: PropertyType;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  hasBalcony: boolean;
  hasParking: boolean;
  doubleLivingRoom?: boolean;
  openKitchen?: boolean;
  laundryCellar?: boolean;
  apartmentElevator?: boolean | null;
  apartmentFloor?: number | null;
  outdoorSpace?: OutdoorSpace;
  landSize?: number | null;
  semiDetached?: boolean | null;
  sharedWalls?: 0 | 1 | 2 | null;
  exteriorLayoutQuality?: ExteriorLayoutQuality | null;
  poolOption?: PoolOption;
  criteriaCalm?: boolean;
  criteriaBright?: boolean;
  criteriaNearAmenities?: boolean;
  criteriaNoVisAvis?: boolean;
  criteriaWellConnected?: boolean;
  amenityAirConditioning?: boolean;
  amenityModernBathroom?: boolean;
  amenityRecentKitchen?: boolean;
  amenityFireplace?: boolean;
  amenityElectricityStandard?: boolean;
  amenityDoubleTripleGlazing?: boolean;
  parkingGarage?: boolean;
  parkingPrivate?: boolean;
  parkingShared?: boolean;
  parkingStreet?: boolean;
  ownershipType: OwnershipType;
  deadline: Deadline;
  condition?: string;
}

export class PropertyEstimateService {
  private repo: PropertyEstimateRepo;
  private valuationService: PropertyEstimateValuationService;
  private buyerEngagementRepo: BuyerEngagementRepo;

  constructor() {
    this.repo = new PropertyEstimateRepo();
    this.valuationService = new PropertyEstimateValuationService();
    this.buyerEngagementRepo = new BuyerEngagementRepo();
  }

  async createEstimate(
    dto: CreatePropertyEstimateDto,
    userId?: string
  ): Promise<PropertyEstimate> {
    const { basePricePerSqM, estimatedPrice } =
      await this.valuationService.calculatePrice(dto);

    return this.repo.createWithRelations({
      ...dto,
      basePricePerSqM,
      estimatedPrice,
      impressions: 0,
      buyerTracking: true,
      status: userId ? PropertyStatus.NEW : PropertyStatus.DRAFT,
      userId: userId || undefined,
    });
  }

  getRangeWidthPercent(centerPrice: number): number {
    return this.valuationService.getRangeWidthPercent(centerPrice);
  }

  async findAll(): Promise<PropertyEstimate[]> {
    return this.repo.findAll();
  }

  async findOne(id: string): Promise<PropertyEstimate | null> {
    return this.repo.findOne(id);
  }

  async recalculateEstimate(propertyId: string): Promise<PropertyEstimate | null> {
    const estimate = await this.repo.findOne(propertyId);
    if (!estimate) return null;

    const dto: CreatePropertyEstimateDto = {
      address: estimate.address,
      locationCode: estimate.locationCode,
      buildingAge: estimate.buildingAge,
      type: estimate.type,
      area: estimate.area,
      bedrooms: estimate.bedrooms,
      bathrooms: estimate.bathrooms,
      floors: estimate.floors,
      hasBalcony: estimate.hasBalcony,
      hasParking: estimate.hasParking,
      ownershipType: estimate.ownershipType,
      deadline: estimate.deadline,
      condition: estimate.condition,
      criteriaCalm: estimate.criteria?.includes('calm') ?? false,
      criteriaBright: estimate.criteria?.includes('bright') ?? false,
      criteriaNearAmenities: estimate.criteria?.includes('near_amenities') ?? false,
      criteriaNoVisAvis: estimate.criteria?.includes('no_vis_a_vis') ?? false,
      criteriaWellConnected: estimate.criteria?.includes('well_connected') ?? false,
      amenityAirConditioning: estimate.amenities?.includes('air_conditioning') ?? false,
      amenityModernBathroom: estimate.amenities?.includes('modern_bathroom') ?? false,
      amenityRecentKitchen: estimate.amenities?.includes('recent_kitchen') ?? false,
      amenityFireplace: estimate.amenities?.includes('fireplace') ?? false,
      amenityElectricityStandard:
        estimate.amenities?.includes('electricity_standard') ?? false,
      amenityDoubleTripleGlazing:
        estimate.amenities?.includes('double_triple_glazing') ?? false,
      doubleLivingRoom: estimate.features?.includes('double_living_room') ?? false,
      openKitchen: estimate.features?.includes('open_kitchen') ?? false,
      laundryCellar: estimate.features?.includes('laundry_cellar') ?? false,
      parkingGarage: estimate.parking?.includes('garage') ?? false,
      parkingPrivate: estimate.parking?.includes('private') ?? false,
      parkingShared: estimate.parking?.includes('shared') ?? false,
      parkingStreet: estimate.parking?.includes('street') ?? false,
      apartmentElevator: estimate.apartmentDetails?.hasElevator ?? null,
      apartmentFloor: estimate.apartmentDetails?.floorNumber ?? null,
      outdoorSpace: estimate.apartmentDetails?.outdoorSpace,
      landSize: estimate.houseDetails?.landSize ?? null,
      semiDetached: estimate.houseDetails?.semiDetached ?? null,
      sharedWalls: (estimate.houseDetails?.sharedWalls ?? null) as 0 | 1 | 2 | null,
      exteriorLayoutQuality: estimate.houseDetails?.exteriorLayoutQuality ?? null,
      poolOption: estimate.houseDetails?.poolOption,
    };

    const { basePricePerSqM, estimatedPrice } =
      await this.valuationService.calculatePrice(dto);
    return this.repo.updatePrice(propertyId, basePricePerSqM, estimatedPrice);
  }

  async deleteEstimate(propertyId: string): Promise<boolean> {
    return this.repo.delete(propertyId);
  }

  async getEstimatesByUserId(userId: string): Promise<PropertyEstimate[]> {
    return this.repo.findByUserId(userId);
  }

  async linkDraftEstimatesToUser(
    propertyIds: string[],
    userId: string
  ): Promise<PropertyEstimate[]> {
    return this.repo.linkDraftEstimatesToUser(propertyIds, userId);
  }

  async updateEngagement(
    propertyId: string,
    userId: string,
    data: {
      feedback?: 'accurate' | 'high' | 'low' | 'inaccurate';
      buyerTracking?: boolean;
    }
  ): Promise<PropertyEstimate | null> {
    return this.repo.updateEngagement(propertyId, data, userId);
  }

  async getBuyerInterest(propertyId: string): Promise<{ hasHighBuyerInterest: boolean }> {
    const maxLevel = await this.buyerEngagementRepo.getMaxEngagementLevelByPropertyId(propertyId);
    return { hasHighBuyerInterest: maxLevel >= 10 };
  }

  /**
   * Returns anonymous buyer engagement rows for a property. Only the property owner may call this.
   * (Visibility in the UI may later be gated by buyerTracking; the API allows the owner regardless.)
   */
  async getPotentialBuyers(
    propertyId: string,
    userId: string
  ): Promise<PotentialBuyerRow[]> {
    const property = await this.repo.findOne(propertyId);
    if (!property) {
      throw new AppError('Estimate not found', 404);
    }
    if (property.userId !== userId) {
      throw new AppError('You do not have permission to view potential buyers for this property', 403);
    }
    return this.buyerEngagementRepo.findByPropertyIdAnonymous(propertyId);
  }
}
