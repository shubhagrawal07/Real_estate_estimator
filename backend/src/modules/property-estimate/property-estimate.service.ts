import { PropertyEstimateRepo } from './property-estimate.repo';
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
import { BuyerIntentRepo } from '../buyer-intent/buyer-intent.repo';
import { BuyerIntentType } from '../buyer-intent/buyer-intent.model';
import { AppError } from '../../utils/AppError';

/** Anonymous seller-facing row (legacy shape; criteria from buyer intent). */
export interface PotentialBuyerEntry {
  budget: number | null;
  bedrooms: number;
  surfaceMin: number;
  landArea?: number | null;
  pool: boolean;
  engagementLevel: number;
  interested: boolean;
  /** When set, shown instead of bedrooms/surface line (buyer intent has no search grid). */
  criteriaSummary?: string;
}

const INTENT_WEIGHT: Record<BuyerIntentType, number> = {
  [BuyerIntentType.HIGH_INTEREST]: 100,
  [BuyerIntentType.QUESTION]: 80,
  [BuyerIntentType.ALERT_AVAILABLE]: 50,
  [BuyerIntentType.AREA_INTEREST]: 30,
};

const INTENT_LABEL: Record<BuyerIntentType, string> = {
  [BuyerIntentType.HIGH_INTEREST]: 'High interest',
  [BuyerIntentType.QUESTION]: 'Question',
  [BuyerIntentType.ALERT_AVAILABLE]: 'Availability alert',
  [BuyerIntentType.AREA_INTEREST]: 'Area interest',
};

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
  private buyerIntentRepo: BuyerIntentRepo;

  constructor() {
    this.repo = new PropertyEstimateRepo();
    this.valuationService = new PropertyEstimateValuationService();
    this.buyerIntentRepo = new BuyerIntentRepo();
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

  /**
   * One row per buyer (user) with aggregated buyer_intent signals. Owner only; requires buyer tracking.
   */
  async getPotentialBuyers(propertyId: string, userId: string): Promise<PotentialBuyerEntry[]> {
    const property = await this.repo.findOne(propertyId);
    if (!property) {
      throw new AppError('Estimate not found', 404);
    }
    if (property.userId !== userId) {
      throw new AppError('You do not have permission to view potential buyers for this property', 403);
    }
    if (property.buyerTracking === false) {
      throw new AppError('Buyer tracking is disabled for this property', 403);
    }

    const rows = await this.buyerIntentRepo.findByPropertyId(propertyId);
    if (rows.length === 0) return [];

    const byUser = new Map<
      string,
      { types: Set<BuyerIntentType>; budgets: number[]; maxWeight: number }
    >();
    for (const row of rows) {
      const uid = row.userId;
      let g = byUser.get(uid);
      if (!g) {
        g = { types: new Set(), budgets: [], maxWeight: 0 };
        byUser.set(uid, g);
      }
      g.types.add(row.intentType);
      const w = INTENT_WEIGHT[row.intentType] ?? 0;
      if (w > g.maxWeight) g.maxWeight = w;
      if (row.budget != null && Number.isFinite(Number(row.budget))) {
        g.budgets.push(Number(row.budget));
      }
    }

    const entries: PotentialBuyerEntry[] = [];
    for (const [, g] of byUser) {
      const typesArr = [...g.types].sort((a, b) => (INTENT_WEIGHT[b] ?? 0) - (INTENT_WEIGHT[a] ?? 0));
      const criteriaSummary = typesArr.map((t) => INTENT_LABEL[t]).join(' · ');
      const budgetMax =
        g.budgets.length > 0 ? Math.max(...g.budgets) : null;
      const interested =
        g.types.has(BuyerIntentType.HIGH_INTEREST) || g.types.has(BuyerIntentType.QUESTION);
      entries.push({
        budget: budgetMax,
        bedrooms: 0,
        surfaceMin: 0,
        landArea: null,
        pool: false,
        engagementLevel: g.maxWeight,
        interested,
        criteriaSummary,
      });
    }

    entries.sort((a, b) => {
      if (b.engagementLevel !== a.engagementLevel) return b.engagementLevel - a.engagementLevel;
      const ba = a.budget ?? -1;
      const bb = b.budget ?? -1;
      return bb - ba;
    });
    return entries;
  }
}
