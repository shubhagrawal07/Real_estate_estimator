import { PropertyEstimateRepo } from './property-estimate.repo';
import { PropertyEstimate, PropertyType, OwnershipType, Deadline, PropertyStatus, BuildingAge } from './property-estimate.model';
import { combineLocationCode, parseLocationCode } from './utils/location-code.util';
import { CityBlockSalesDataRepo } from '../city-block-sales-data/city-block-sales-data.repo';
import { OutdoorSpace } from './entities/apartment-details.model';
import { PoolOption } from './entities/house-details.model';

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
    const estimatedPrice = await this.calculatePrice(dto);

    return this.repo.createWithRelations({
      ...dto,
      estimatedPrice,
      impressions: 0,
      status: userId ? PropertyStatus.NEW : PropertyStatus.DRAFT,
      userId: userId || undefined,
    });
  }

  private async calculatePrice(dto: CreatePropertyEstimateDto): Promise<number> {
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

      // Extract department from location code for location-based pricing
      const locationParts = parseLocationCode(dto.locationCode);
      const department = locationParts?.department || '';
      
      // Department-based pricing multiplier
      const locationMultiplier = this.getLocationMultiplier(department);
      basePricePerSqM *= locationMultiplier;
    }

    basePricePerSqM *= 0.90;
    

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

    // const estimatedPrice =
    //   dto.area *
    //   basePricePerSqM;

    return Math.round(estimatedPrice);
  }

  private getLocationMultiplier(department: string): number {
    // Simplified location-based pricing using department code
    // Department codes: 75=Paris, 69=Lyon, 13=Marseille, 31=Toulouse, 06=Nice, 44=Nantes, 67=Strasbourg, 34=Montpellier, 33=Bordeaux, 59=Lille
    const locationMultipliers: { [key: string]: number } = {
      '75': 2.5,  // Paris
      '69': 1.8,  // Lyon
      '13': 1.6,  // Marseille
      '31': 1.4,  // Toulouse
      '06': 1.9,  // Nice
      '44': 1.5,  // Nantes
      '67': 1.3,  // Strasbourg
      '34': 1.4,  // Montpellier
      '33': 1.6,  // Bordeaux
      '59': 1.2,  // Lille
    };

    return locationMultipliers[department] || 1.0;
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

    // 1) Fetch last 36 months with exact idpar
    let all = await this.fetchGroupRecords(locationCode, false, dvtType, start36, end36);
    if (all.length === 0) {
      console.log('[Valuation] No records for idpar=%s type=%s over 36 months, skipping segment valuation', locationCode, dvtType);
      return null;
    }

    console.log('[Valuation] idpar=%s type=%s sbati=%s | raw fetch: %d records (36 months)', locationCode, dvtType, sbati, all.length);

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

    const prefixes = this.getIdparPrefixes(locationCode);

    const tryBase = async (
      group: { sbati: number; price: number }[],
      start: Date,
      end: Date
    ): Promise<number | null> => {
      let base = this.basePriceFromSegments(group, bounds);
      if (base != null) return base;

      for (const pre of prefixes) {
        const fetched = await this.fetchGroupRecords(pre, true, dvtType, start, end);
        const asObj = fetched.map((r) => ({ sbati: Number(r.sbati), price: Number(r.price) }));
        base = this.basePriceFromSegments(asObj, bounds);
        if (base != null) return base;
      }
      return null;
    };

    const base1 = await tryBase(group1, split18, end36);
    const base2 = await tryBase(group2, start36, endGroup2);

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
    return this.repo.findOne(id);
  }

  async recalculateEstimate(propertyId: string): Promise<PropertyEstimate | null> {
    const estimate = await this.repo.findOne(propertyId);
    if (!estimate) {
      return null;
    }

    // Convert estimate to DTO format for price calculation
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
    };

    const newEstimatedPrice = await this.calculatePrice(dto);
    
    // Update only the estimated price
    return this.repo.updateEstimatedPrice(propertyId, newEstimatedPrice);
  }

  async deleteEstimate(propertyId: string): Promise<boolean> {
    return this.repo.delete(propertyId);
  }
}
