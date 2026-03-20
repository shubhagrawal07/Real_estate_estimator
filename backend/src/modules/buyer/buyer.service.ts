import { PropertyEstimateRepo } from '../property-estimate/property-estimate.repo';
import { PropertyType } from '../property-estimate/property-estimate.model';
import { parseLocationCode } from '../property-estimate/utils/location-code.util';
import { PoolOption } from '../property-estimate/entities/house-details.model';
import type { HouseDetails } from '../property-estimate/entities/house-details.model';

/** Point distribution: budget > surface area > bedroom > others (pool, land area) */
const BUDGET_POINTS = 45;
const SURFACE_AREA_POINTS = 25;
const BEDROOM_POINTS = 20;
const POOL_POINTS = 5;
const LAND_AREA_POINTS = 5;

export interface BuyerSearchDto {
  propertyType: PropertyType;
  cityInseeCode: string;
  cadastralSection?: string;
  budget: number;
  bedrooms: number;
  minSurfaceArea: number;
  pool?: boolean;
  minLandArea?: number;
}

export interface RankedProperty {
  propertyId: string;
  address: string;
  latitude?: number;
  longitude?: number;
  estimatedPrice?: number;
  type: PropertyType;
  area: number;
  bedrooms: number;
  rankScore: number;
  budgetScore: number;
  surfaceAreaScore: number;
  bedroomScore: number;
  poolScore?: number;
  landAreaScore?: number;
}

export class BuyerService {
  private propertyRepo: PropertyEstimateRepo;

  constructor() {
    this.propertyRepo = new PropertyEstimateRepo();
  }

  /**
   * Search and rank properties based on buyer criteria.
   * When cadastralSection is omitted, matches all cadastral sections in the city.
   */
  async searchProperties(searchDto: BuyerSearchDto): Promise<RankedProperty[]> {
    const allProperties = await this.propertyRepo.findAll();
    const matchByCityOnly = !searchDto.cadastralSection || searchDto.cadastralSection.length === 0;

    // Filter properties by city (and optionally cadastral section) and property type
    const filteredProperties = allProperties.filter((property) => {
      const propertyLocation = parseLocationCode(property.locationCode);
      if (!propertyLocation) return false;

      const cityMatch = propertyLocation.codeInsee === searchDto.cityInseeCode;
      const sectionMatch = matchByCityOnly
        ? true
        : propertyLocation.cadastralSection === searchDto.cadastralSection!.toUpperCase();
      const typeMatch = property.type === searchDto.propertyType;

      return cityMatch && sectionMatch && typeMatch;
    });

    const rankedProperties: RankedProperty[] = filteredProperties.map((property) => {
      const budgetScore = this.calculateBudgetScore(searchDto.budget, property.estimatedPrice || 0);
      const surfaceAreaScore = this.calculateSurfaceAreaScore(
        searchDto.minSurfaceArea,
        property.area
      );
      const bedroomScore = this.calculateBedroomScore(searchDto.bedrooms, property.bedrooms);
      const houseDetails = property.houseDetails as HouseDetails | undefined;
      const poolScore =
        searchDto.propertyType === PropertyType.HOUSE && searchDto.pool
          ? this.calculatePoolScore(houseDetails?.poolOption)
          : undefined;
      const landAreaScore =
        searchDto.propertyType === PropertyType.HOUSE && searchDto.minLandArea != null && searchDto.minLandArea > 0
          ? this.calculateLandAreaScore(searchDto.minLandArea, houseDetails?.landSize ?? 0)
          : undefined;

      const totalScore =
        budgetScore +
        surfaceAreaScore +
        bedroomScore +
        (poolScore ?? POOL_POINTS) +
        (landAreaScore ?? LAND_AREA_POINTS);

      return {
        propertyId: property.propertyId,
        address: property.address,
        latitude: property.latitude ? Number(property.latitude) : undefined,
        longitude: property.longitude ? Number(property.longitude) : undefined,
        estimatedPrice: property.estimatedPrice || undefined,
        type: property.type,
        area: property.area,
        bedrooms: property.bedrooms,
        rankScore: Math.round(totalScore * 100) / 100,
        budgetScore,
        surfaceAreaScore,
        bedroomScore,
        ...(poolScore !== undefined && { poolScore }),
        ...(landAreaScore !== undefined && { landAreaScore }),
      };
    });

    // Sort by rank score (descending) - highest score first
    rankedProperties.sort((a, b) => b.rankScore - a.rankScore);

    return rankedProperties;
  }

  /** Budget score (out of BUDGET_POINTS): closest to budget gets highest score */
  private calculateBudgetScore(buyerBudget: number, propertyPrice: number): number {
    if (propertyPrice === 0) return 0;
    const difference = Math.abs(propertyPrice - buyerBudget);
    const percentageDiff = difference / buyerBudget;
    const score = Math.max(0, BUDGET_POINTS * (1 - percentageDiff));
    return Math.round(score * 100) / 100;
  }

  /** Surface area score (out of SURFACE_AREA_POINTS): meets or exceeds min gets full; otherwise proportional */
  private calculateSurfaceAreaScore(minArea: number, propertyArea: number): number {
    if (minArea <= 0) return SURFACE_AREA_POINTS;
    if (propertyArea >= minArea) return SURFACE_AREA_POINTS;
    const score = SURFACE_AREA_POINTS * (propertyArea / minArea);
    return Math.round(score * 100) / 100;
  }

  /** Bedroom score (out of BEDROOM_POINTS): perfect match highest, then off by 1, 2, etc. */
  private calculateBedroomScore(buyerBedrooms: number, propertyBedrooms: number): number {
    if (buyerBedrooms === 0) return BEDROOM_POINTS;
    const difference = Math.abs(propertyBedrooms - buyerBedrooms);
    let score: number;
    if (difference === 0) score = BEDROOM_POINTS;
    else if (difference === 1) score = 15;
    else if (difference === 2) score = 8;
    else score = Math.max(0, BEDROOM_POINTS - difference * 5);
    return Math.round(score * 100) / 100;
  }

  /** Pool score (out of POOL_POINTS): full if house has pool or possible, else 0 */
  private calculatePoolScore(poolOption?: PoolOption): number {
    if (!poolOption) return 0;
    if (poolOption === PoolOption.POOL) return POOL_POINTS;
    if (poolOption === PoolOption.POSSIBLE) return POOL_POINTS * 0.7;
    return 0;
  }

  /** Land area score (out of LAND_AREA_POINTS): meets or exceeds min gets full; otherwise proportional */
  private calculateLandAreaScore(minLandArea: number, propertyLandSize: number): number {
    if (minLandArea <= 0) return LAND_AREA_POINTS;
    if (propertyLandSize >= minLandArea) return LAND_AREA_POINTS;
    const score = LAND_AREA_POINTS * (propertyLandSize / minLandArea);
    return Math.round(score * 100) / 100;
  }
}

