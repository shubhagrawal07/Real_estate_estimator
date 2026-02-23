import { PropertyEstimateRepo } from './property-estimate.repo';
import { PropertyEstimate, PropertyType, OwnershipType, Deadline, PropertyStatus, BuildingAge } from './property-estimate.model';
import { combineLocationCode, parseLocationCode } from './utils/location-code.util';
import { CityBlockSalesDataRepo } from '../city-block-sales-data/city-block-sales-data.repo';
import { OutdoorSpace } from './entities/apartment-details.model';
import { PoolOption, ExteriorLayoutQuality } from './entities/house-details.model';
import {
  CRITERIA_PRICE_IMPACTS,
  AMENITY_PRICE_IMPACTS,
  FEATURE_PRICE_IMPACTS,
  PARKING_PRICE_IMPACTS,
  calculateTotalPriceImpact,
} from './constants/price-impact-factors';

export interface CreatePropertyEstimateDto {
  address: string;
  locationCode: string; // Format: {code_insee}{padding}{cadastral_section} e.g., "83137000BY"
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
  /** 0 = detached, 1 = semi-detached, 2 = two shared walls. If not set, derived from semiDetached. */
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
  private cityBlockSalesRepo: CityBlockSalesDataRepo;

  constructor() {
    this.repo = new PropertyEstimateRepo();
    this.cityBlockSalesRepo = new CityBlockSalesDataRepo();
  }

  async createEstimate(dto: CreatePropertyEstimateDto, userId?: string): Promise<PropertyEstimate> {
    const { basePricePerSqM, estimatedPrice } = await this.calculatePrice(dto);

    return this.repo.createWithRelations({
      ...dto,
      basePricePerSqM,
      estimatedPrice,
      impressions: 0,
      status: userId ? PropertyStatus.NEW : PropertyStatus.DRAFT,
      userId: userId || undefined,
    });
  }

  private async calculatePrice(dto: CreatePropertyEstimateDto): Promise<{ basePricePerSqM: number; estimatedPrice: number }> {
    // Try segment-based valuation (36 months, sbati segments, weighted formula) first
    let basePricePerSqM = await this.getPricePerSqMFromSegmentValuation(
      dto.locationCode,
      dto.type,
      dto.area
    );

    // If segment valuation returns null, try legacy aggregated euros/m²
    if (!basePricePerSqM) {
      basePricePerSqM = await this.getPricePerSqMFromSalesData(dto.locationCode, dto.type);
    }

    // If no sales data found, fall back to default pricing
    if (!basePricePerSqM) {
      basePricePerSqM = 2000; // Base price per square meter
    }

    basePricePerSqM *= 0.90;

    // Save the basePricePerSqM value (this is what we'll store in the database)
    const savedBasePricePerSqM = basePricePerSqM;

    // Calculate price impacts from criteria, amenities, features, and parking
    const criteriaCodes: string[] = [];
    if (dto.criteriaCalm) criteriaCodes.push('calm');
    if (dto.criteriaBright) criteriaCodes.push('bright');
    if (dto.criteriaNearAmenities) criteriaCodes.push('near_amenities');
    if (dto.criteriaNoVisAvis) criteriaCodes.push('no_vis_a_vis');
    if (dto.criteriaWellConnected) criteriaCodes.push('well_connected');

    const amenityCodes: string[] = [];
    if (dto.amenityAirConditioning) amenityCodes.push('air_conditioning');
    if (dto.amenityModernBathroom) amenityCodes.push('modern_bathroom');
    if (dto.amenityRecentKitchen) amenityCodes.push('recent_kitchen');
    if (dto.amenityFireplace) amenityCodes.push('fireplace');
    if (dto.amenityElectricityStandard) amenityCodes.push('electricity_standard');
    if (dto.amenityDoubleTripleGlazing) amenityCodes.push('double_triple_glazing');

    const featureCodes: string[] = [];
    if (dto.doubleLivingRoom) featureCodes.push('double_living_room');
    if (dto.openKitchen) featureCodes.push('open_kitchen');
    if (dto.laundryCellar) featureCodes.push('laundry_cellar');

    const parkingCodes: string[] = [];
    if (dto.parkingGarage) parkingCodes.push('garage');
    if (dto.parkingPrivate) parkingCodes.push('private');
    if (dto.parkingShared) parkingCodes.push('shared');
    if (dto.parkingStreet) parkingCodes.push('street');

    // Calculate total price impact percentage
    const criteriaImpact = calculateTotalPriceImpact(criteriaCodes, CRITERIA_PRICE_IMPACTS);
    const amenityImpact = calculateTotalPriceImpact(amenityCodes, AMENITY_PRICE_IMPACTS);
    const featureImpact = calculateTotalPriceImpact(featureCodes, FEATURE_PRICE_IMPACTS);
    const parkingImpact = calculateTotalPriceImpact(parkingCodes, PARKING_PRICE_IMPACTS);

    const totalPriceImpactPercent = criteriaImpact + amenityImpact + featureImpact + parkingImpact;
    const priceMultiplier = 1 + totalPriceImpactPercent / 100;

    // Bedroom multiplier
    const bedroomMultiplier = 1 + (dto.bedrooms - 2) * 0.1;
    
    // Bathroom multiplier
    // const bathroomMultiplier = 1 + (dto.bathrooms - 1.5) * 0.15;

    // Apartment floor multiplier (only for apartments)
    const apartmentFloorMultiplier = this.getApartmentFloorMultiplier(
      dto.type,
      dto.apartmentElevator,
      dto.apartmentFloor
    );

    // Land area multiplier (only for houses)
    const landAreaMultiplier = this.getLandAreaMultiplier(
      dto.type,
      dto.landSize
    );

    // Exterior layout quality multiplier (only for houses)
    const exteriorLayoutMultiplier = this.getExteriorLayoutMultiplier(
      dto.type,
      dto.exteriorLayoutQuality
    );

    // House structural multiplier (only for houses: detached 0%, 1 shared wall -3%, 2 shared walls -6%)
    const structuralMultiplier = this.getStructuralMultiplier(
      dto.type,
      dto.semiDetached,
      dto.sharedWalls
    );

    // Condition multiplier
    const conditionMultiplier = this.getConditionMultiplier(dto.condition);

    // Apply multipliers after basePricePerSqM * area
    const basePrice = savedBasePricePerSqM * dto.area;
    const rawPrice = basePrice *
      priceMultiplier *
      bedroomMultiplier *
      apartmentFloorMultiplier *
      landAreaMultiplier *
      exteriorLayoutMultiplier *
      structuralMultiplier *
      conditionMultiplier;

    // Range adjustment: round center to nearest 5000, apply tiered range width (house and apartment)
    const roundedCenter = this.roundToNearest5000(rawPrice);
    const estimatedPrice = roundedCenter;

    return {
      basePricePerSqM: savedBasePricePerSqM,
      estimatedPrice,
    };
  }

  /** Round value to nearest 5000. */
  private roundToNearest5000(value: number): number {
    return Math.round(value / 5000) * 5000;
  }

  /**
   * Range width (as decimal, e.g. 0.08 for ±8%): ≤250k → ±8%, 250k–500k → ±6%, >500k → ±5%.
   * Used for display; center price is stored as estimatedPrice.
   */
  getRangeWidthPercent(centerPrice: number): number {
    if (centerPrice <= 250_000) return 0.08;
    if (centerPrice <= 500_000) return 0.06;
    return 0.05;
  }

  /**
   * Exterior layout quality multiplier (houses only): Basic 0%, Maintained garden +2%, Premium outdoor +3%.
   */
  private getExteriorLayoutMultiplier(
    propertyType: PropertyType,
    quality?: ExteriorLayoutQuality | null
  ): number {
    if (propertyType !== PropertyType.HOUSE || quality == null) return 1.0;
    switch (quality) {
      case ExteriorLayoutQuality.BASIC:
        return 1.0;
      case ExteriorLayoutQuality.MAINTAINED_GARDEN:
        return 1.02;
      case ExteriorLayoutQuality.PREMIUM_OUTDOOR:
        return 1.03;
      default:
        return 1.0;
    }
  }

  /**
   * House structural multiplier: Detached 0%, one shared wall (semi-detached) -3%, two shared walls -6%.
   * sharedWalls overrides semiDetached when set (0/1/2). If not set, semiDetached true → 1, false → 0.
   */
  private getStructuralMultiplier(
    propertyType: PropertyType,
    semiDetached?: boolean | null,
    sharedWalls?: 0 | 1 | 2 | null
  ): number {
    if (propertyType !== PropertyType.HOUSE) return 1.0;
    const walls = sharedWalls ?? (semiDetached ? 1 : 0);
    if (walls === 0) return 1.0;
    if (walls === 1) return 0.97;
    return 0.94; // 2 shared walls
  }

  // --- Segment-based valuation (36 months, sbati segments, weighted formula) ---

  /** Minimum records per segment (A,B,C,D). If below, we use longest-matching idpar prefix. */
  private static readonly MIN_RECORDS_PER_SEGMENT = 5;

  /**
   * Returns idpar prefixes for longest-matching-prefix fallback (stripping from the right).
   * e.g. "83137000BC" -> ["83137000B", "83137000"]. Stops at length 8 (code_insee+000).
   */
  private getIdparPrefixes(idpar: string): string[] {
    const prefixes: string[] = [];
    for (let len = idpar.length - 1; len >= 8; len--) {
      prefixes.push(idpar.slice(0, len));
    }
    return prefixes;
  }

  /**
   * Segment bounds for sbati (our property's area). Returns [min, max] for each segment.
   * A: ±20%; B: ±(20–30)%; C: ±(30–40)%; D: ±(40–50)%. Others are ignored.
   */
  private getSegmentBounds(sbati: number): { A: [number, number]; B: [number, number][]; C: [number, number][]; D: [number, number][] } {
    return {
      A: [sbati * 0.8, sbati * 1.2],
      B: [[sbati * 0.7, sbati * 0.8], [sbati * 1.2, sbati * 1.3]],
      C: [[sbati * 0.6, sbati * 0.7], [sbati * 1.3, sbati * 1.4]],
      D: [[sbati * 0.5, sbati * 0.6], [sbati * 1.4, sbati * 1.5]],
    };
  }

  /**
   * Assigns records to segments A–D. Each record appears in at most one segment.
   * Uses inclusive bounds: A [0.8,1.2], B [0.7,0.8] and [1.2,1.3], etc.
   */
  private assignToSegments<T extends { sbati: number }>(
    records: T[],
    bounds: ReturnType<PropertyEstimateService['getSegmentBounds']>
  ): { A: T[]; B: T[]; C: T[]; D: T[] } {
    const A: T[] = [];
    const B: T[] = [];
    const C: T[] = [];
    const D: T[] = [];
    for (const r of records) {
      const s = Number(r.sbati);
      if (s >= bounds.A[0] && s <= bounds.A[1]) A.push(r);
      else if (bounds.B.some(([lo, hi]) => s >= lo && s <= hi)) B.push(r);
      else if (bounds.C.some(([lo, hi]) => s >= lo && s <= hi)) C.push(r);
      else if (bounds.D.some(([lo, hi]) => s >= lo && s <= hi)) D.push(r);
    }
    return { A, B, C, D };
  }

  /**
   * Average price per m² for a segment: (1/n) * sum(price_i / sbati_i).
   */
  private avgPricePerSqM(records: { price: number; sbati: number }[]): number {
    if (records.length === 0) return 0;
    const sum = records.reduce((acc, r) => acc + Number(r.price) / Math.max(1, Number(r.sbati)), 0);
    return sum / records.length;
  }

  /**
   * Fetch records for a group's date range, optionally using an idpar prefix.
   */
  private async fetchGroupRecords(
    idpar: string,
    usePrefix: boolean,
    dvtType: string,
    start: Date,
    end: Date
  ) {
    return this.cityBlockSalesRepo.findRecordsForValuation(
      idpar,
      usePrefix,
      dvtType,
      start,
      end
    );
  }

  /**
   * For a set of records, compute weighted base price per m² if all segments have at least
   * MIN_RECORDS_PER_SEGMENT. Otherwise returns null.
   * Formula: 0.5*avgA + 0.25*avgB + 0.15*avgC + 0.1*avgD.
   */
  private basePriceFromSegments(
    records: { sbati: number; price: number }[],
    bounds: ReturnType<PropertyEstimateService['getSegmentBounds']>
  ): number | null {
    const { A, B, C, D } = this.assignToSegments(records, bounds);
    const min = PropertyEstimateService.MIN_RECORDS_PER_SEGMENT;
    if (A.length < min || B.length < min || C.length < min || D.length < min) {
      return null;
    }
    const avgA = this.avgPricePerSqM(A);
    const avgB = this.avgPricePerSqM(B);
    const avgC = this.avgPricePerSqM(C);
    const avgD = this.avgPricePerSqM(D);
    return 0.5 * avgA + 0.25 * avgB + 0.15 * avgC + 0.1 * avgD;
  }

  /**
   * Get price per square meter using segment-based valuation:
   * - Last 36 months of sales for idpar + property type
   * - Split into latest 18 months and older 18 months
   * - For each group, segments A–D by sbati (±20%, ±20–30%, ±30–40%, ±40–50%)
   * - If any segment has &lt;5 records, longest-matching idpar prefix until ≥5
   * - Base = 0.5*avgA + 0.25*avgB + 0.15*avgC + 0.1*avgD per group; final = 0.55*latest18 + 0.45*older18
   *
   * @param locationCode - idpar (e.g. "83137000BY")
   * @param propertyType - APARTMENT or HOUSE
   * @param sbati - our property's area (m²)
   * @returns Price per m² in euros, or null to fall back to aggregated/ default
   */
  private async getPricePerSqMFromSegmentValuation(
    locationCode: string,
    propertyType: PropertyType,
    sbati: number
  ): Promise<number | null> {
    const dvtType = propertyType === PropertyType.APARTMENT ? 'APPARTEMENT' : 'MAISON';
    const now = new Date();
    const m = (n: number) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - n);
      return d;
    };
    const end36 = now;
    const start36 = m(36);
    const split18 = m(18);

    // 1) Fetch last 36 months - try exact idpar first, then expand to prefixes if no records
    let all = await this.fetchGroupRecords(locationCode, false, dvtType, start36, end36);
    if (all.length === 0) {
      const prefixesForInitial = this.getIdparPrefixes(locationCode);
      for (const pre of prefixesForInitial) {
        all = await this.fetchGroupRecords(pre, true, dvtType, start36, end36);
        if (all.length > 0) {
          console.log('[Valuation] No exact idpar records; expanded to prefix=%s: %d records (36 months)', pre, all.length);
          break;
        }
      }
      if (all.length === 0) {
        console.log('[Valuation] No records for idpar=%s type=%s over 36 months (tried all prefixes), skipping segment valuation', locationCode, dvtType);
        return null;
      }
    } else {
      console.log('[Valuation] idpar=%s type=%s sbati=%s | raw fetch: %d records (36 months)', locationCode, dvtType, sbati, all.length);
    }

    const bounds = this.getSegmentBounds(sbati);

    // 2) Split into latest 18 and older 18
    const group1: { sbati: number; price: number; date: Date }[] = [];
    const group2: { sbati: number; price: number; date: Date }[] = [];
    for (const r of all) {
      const d = typeof r.date === 'string' ? new Date(r.date) : r.date;
      const row = { sbati: Number(r.sbati), price: Number(r.price), date: d };
      if (d >= split18) group1.push(row);
      else if (d >= start36) group2.push(row);
    }

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const endGroup2 = new Date(split18);
    endGroup2.setDate(endGroup2.getDate() - 1);

    const logGroup = (label: string, recs: { sbati: number; price: number }[], from: Date, to: Date) => {
      const { A, B, C, D } = this.assignToSegments(recs, bounds);
      const avgs = {
        A: A.length ? this.avgPricePerSqM(A).toFixed(0) : '-',
        B: B.length ? this.avgPricePerSqM(B).toFixed(0) : '-',
        C: C.length ? this.avgPricePerSqM(C).toFixed(0) : '-',
        D: D.length ? this.avgPricePerSqM(D).toFixed(0) : '-',
      };
      console.log('[Valuation] %s: dateRange [%s, %s] count=%d | segments A=%d B=%d C=%d D=%d | avg €/m² A=%s B=%s C=%s D=%s',
        label, fmt(from), fmt(to), recs.length, A.length, B.length, C.length, D.length, avgs.A, avgs.B, avgs.C, avgs.D);
    };

    logGroup('New data (latest 18 months)', group1, split18, end36);
    logGroup('Old data (older 18 months)', group2, start36, endGroup2);

    const minPerSeg = PropertyEstimateService.MIN_RECORDS_PER_SEGMENT;
    const { A: a1, B: b1, C: c1, D: d1 } = this.assignToSegments(group1, bounds);
    const { A: a2, B: b2, C: c2, D: d2 } = this.assignToSegments(group2, bounds);
    const needExpand1 = a1.length < minPerSeg || b1.length < minPerSeg || c1.length < minPerSeg || d1.length < minPerSeg;
    const needExpand2 = a2.length < minPerSeg || b2.length < minPerSeg || c2.length < minPerSeg || d2.length < minPerSeg;
    if (needExpand1 || needExpand2) {
      console.log('[Valuation] Some segments have <%d records; expanding to idpar prefixes (need ≥%d per A,B,C,D)', minPerSeg, minPerSeg);
    }

    const prefixes = this.getIdparPrefixes(locationCode);

    const tryBase = async (
      group: { sbati: number; price: number }[],
      start: Date,
      end: Date,
      groupLabel: string
    ): Promise<number | null> => {
      let base = this.basePriceFromSegments(group, bounds);
      if (base != null) {
        const { A, B, C, D } = this.assignToSegments(group, bounds);
        console.log('[Valuation] %s: exact idpar sufficient | count=%d | segments A=%d B=%d C=%d D=%d ✓', groupLabel, group.length, A.length, B.length, C.length, D.length);
        return base;
      }

      // Exact idpar has insufficient segments (need ≥5 per A,B,C,D); expand to next prefix
      for (const pre of prefixes) {
        const fetched = await this.fetchGroupRecords(pre, true, dvtType, start, end);
        const asObj = fetched.map((r) => ({ sbati: Number(r.sbati), price: Number(r.price) }));
        base = this.basePriceFromSegments(asObj, bounds);
        if (base != null) {
          const { A, B, C, D } = this.assignToSegments(asObj, bounds);
          console.log('[Valuation] %s: expanded to prefix=%s | count=%d | segments A=%d B=%d C=%d D=%d (all ≥%d) ✓',
            groupLabel, pre, asObj.length, A.length, B.length, C.length, D.length, PropertyEstimateService.MIN_RECORDS_PER_SEGMENT);
          return base;
        }
      }
      console.log('[Valuation] %s: insufficient segments even after trying all prefixes (need ≥%d per segment)', groupLabel, PropertyEstimateService.MIN_RECORDS_PER_SEGMENT);
      return null;
    };

    const base1 = await tryBase(group1, split18, end36, 'latest 18mo');
    const base2 = await tryBase(group2, start36, endGroup2, 'older 18mo');

    console.log('[Valuation] base1 (latest 18 months)=%s base2 (older 18 months)=%s', base1 != null ? base1.toFixed(2) : 'null', base2 != null ? base2.toFixed(2) : 'null');

    let finalBase: number;
    if (base1 != null && base2 != null) {
      finalBase = base1 * 0.55 + base2 * 0.45;
      console.log('[Valuation] final base price €/m²=%s (0.55*%s + 0.45*%s)', finalBase.toFixed(2), base1.toFixed(2), base2.toFixed(2));
      return finalBase;
    }
    if (base1 != null) {
      finalBase = base1;
      console.log('[Valuation] final base price €/m²=%s (only latest 18 months)', finalBase.toFixed(2));
      return finalBase;
    }
    if (base2 != null) {
      finalBase = base2;
      console.log('[Valuation] final base price €/m²=%s (only older 18 months)', finalBase.toFixed(2));
      return finalBase;
    }
    console.log('[Valuation] final base price=null (insufficient segments in both groups)');
    return null;
  }

  /**
   * Get price per square meter from city_block_sales_data (aggregated, fallback)
   * Uses locationCode as idpar to query the sales data
   * @param locationCode - Location code (format: {code_insee}{padding}{cadastral_section}, e.g., "83137000BY")
   * @param propertyType - Property type (APARTMENT or HOUSE)
   * @returns Price per square meter in euros, or null if no data found
   */
  private async getPricePerSqMFromSalesData(
    locationCode: string,
    propertyType: PropertyType
  ): Promise<number | null> {
    try {
      // Use locationCode as idpar (they have the same format: code_insee + 000 + section)
      // Get aggregated data from all records matching this idpar
      const aggregatedData = await this.cityBlockSalesRepo.getAggregatedDataByIdpar(locationCode);

      if (!aggregatedData) {
        return null;
      }

      let pricePerSqM: number | null = null;

      if (propertyType === PropertyType.APARTMENT) {
        // For apartments: calculate euros/m² using apartment_sbati (living area) and apartment_price
        if (aggregatedData.apartmentCount > 0 && aggregatedData.apartmentSbati > 0) {
          pricePerSqM = aggregatedData.apartmentPrice / aggregatedData.apartmentSbati;
        }
      } else if (propertyType === PropertyType.HOUSE) {
        // For houses (mansions): calculate euros/m² using mansion_sbati (living area) and mansion_price
        if (aggregatedData.mansionCount > 0 && aggregatedData.mansionSbati > 0) {
          pricePerSqM = aggregatedData.mansionPrice / aggregatedData.mansionSbati;
        }
      }

      return pricePerSqM && pricePerSqM > 0 ? pricePerSqM : null;
    } catch (error) {
      console.error('Error fetching price per sqm from sales data:', error);
      return null;
    }
  }

  private getConditionMultiplier(condition?: string): number {
    if (!condition) return 1.0;
    
    const conditionMultipliers: { [key: string]: number } = {
      'excellent': 1.12,
      'good': 0.0,
      'fair': 0.85,
      'poor': 0.7,
      'needs renovation': 0.88,
    };

    return conditionMultipliers[condition.toLowerCase()] || 1.0;
  }

  /**
   * Get apartment floor multiplier based on floor number and elevator availability
   * Only applies to apartments
   * @param propertyType - Property type (APARTMENT or HOUSE)
   * @param hasElevator - Whether the apartment has an elevator
   * @param floorNumber - Floor number (0th, 1st, 2nd, 3rd or higher)
   * @returns Multiplier value (0.0 for 0th floor, or based on floor and elevator)
   */
  private getApartmentFloorMultiplier(
    propertyType: PropertyType,
    hasElevator?: boolean | null,
    floorNumber?: number | null
  ): number {
    // Only apply to apartments
    if (propertyType !== PropertyType.APARTMENT) {
      return 1.0;
    }

    // If floor number is not provided or is null, default to 1.0 (no multiplier)
    if (floorNumber === null || floorNumber === undefined || floorNumber === 0) {
      return 1.0;
    }


    const hasElevatorValue = hasElevator === true;

    if (!hasElevatorValue) {
      // Apartment WITHOUT elevator
      if (floorNumber === 1) {
        return 0.99;
      } else if (floorNumber === 2) {
        return 0.97;
      } else if (floorNumber >= 3) {
        return 0.92;
      }
    } else {
      // Apartment WITH elevator
      if (floorNumber === 1) {
        return 1.01;
      } else if (floorNumber === 2) {
        return 1.02;
      } else if (floorNumber >= 3) {
        return 1.04;
      }
    }

    // Default fallback (should not reach here, but just in case)
    return 1.0;
  }

  /**
   * Get land area multiplier based on land size (modest corrections).
   * Only applies to houses.
   * <150 m² → -4%; 150–500 m² → 0%; 500–1000 m² → +2%; ≥1000 m² → max +3%
   */
  private getLandAreaMultiplier(
    propertyType: PropertyType,
    landSize?: number | null
  ): number {
    if (propertyType !== PropertyType.HOUSE) return 1.0;
    if (landSize === null || landSize === undefined) return 1.0;

    if (landSize < 150) return 0.96;
    if (landSize < 500) return 1.0;
    if (landSize < 1000) return 1.02;
    return 1.03; // ≥1000 m² → max +3%
  }

  async findAll(): Promise<PropertyEstimate[]> {
    return this.repo.findAll();
  }

  async findOne(id: string): Promise<PropertyEstimate | null> {
    return this.repo.findOne(id);
  }

  async recalculateEstimate(propertyId: string): Promise<PropertyEstimate | null> {
    const estimate = await this.repo.findOne(propertyId);
    if (!estimate) {
      return null;
    }

    // Convert estimate to DTO format for price calculation
    // Map JSON arrays back to boolean fields for DTO
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
      // Map criteria codes to boolean fields
      criteriaCalm: estimate.criteria?.includes('calm') || false,
      criteriaBright: estimate.criteria?.includes('bright') || false,
      criteriaNearAmenities: estimate.criteria?.includes('near_amenities') || false,
      criteriaNoVisAvis: estimate.criteria?.includes('no_vis_a_vis') || false,
      criteriaWellConnected: estimate.criteria?.includes('well_connected') || false,
      // Map amenity codes to boolean fields
      amenityAirConditioning: estimate.amenities?.includes('air_conditioning') || false,
      amenityModernBathroom: estimate.amenities?.includes('modern_bathroom') || false,
      amenityRecentKitchen: estimate.amenities?.includes('recent_kitchen') || false,
      amenityFireplace: estimate.amenities?.includes('fireplace') || false,
      amenityElectricityStandard: estimate.amenities?.includes('electricity_standard') || false,
      amenityDoubleTripleGlazing: estimate.amenities?.includes('double_triple_glazing') || false,
      // Map feature codes to boolean fields
      doubleLivingRoom: estimate.features?.includes('double_living_room') || false,
      openKitchen: estimate.features?.includes('open_kitchen') || false,
      laundryCellar: estimate.features?.includes('laundry_cellar') || false,
      // Map parking codes to boolean fields
      parkingGarage: estimate.parking?.includes('garage') || false,
      parkingPrivate: estimate.parking?.includes('private') || false,
      parkingShared: estimate.parking?.includes('shared') || false,
      parkingStreet: estimate.parking?.includes('street') || false,
      // Map apartment-specific fields
      apartmentElevator: estimate.apartmentDetails?.hasElevator || null,
      apartmentFloor: estimate.apartmentDetails?.floorNumber ?? null,
      outdoorSpace: estimate.apartmentDetails?.outdoorSpace,
      // Map house-specific fields
      landSize: estimate.houseDetails?.landSize ?? null,
      semiDetached: estimate.houseDetails?.semiDetached ?? null,
      sharedWalls: (estimate.houseDetails?.sharedWalls ?? null) as 0 | 1 | 2 | null,
      exteriorLayoutQuality: estimate.houseDetails?.exteriorLayoutQuality ?? null,
      poolOption: estimate.houseDetails?.poolOption,
    };

    const { basePricePerSqM, estimatedPrice } = await this.calculatePrice(dto);
    
    // Update both basePricePerSqM and estimated price
    return this.repo.updatePrice(propertyId, basePricePerSqM, estimatedPrice);
  }

  async deleteEstimate(propertyId: string): Promise<boolean> {
    return this.repo.delete(propertyId);
  }
}
