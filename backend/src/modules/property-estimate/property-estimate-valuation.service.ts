/**
 * Handles price calculation logic: segment valuation, sales data fallback,
 * and all multipliers. Used by PropertyEstimateService for create and recalculate.
 */

import { PropertyType } from './property-estimate.model';
import { CityBlockSalesDataRepo } from '../city-block-sales-data/city-block-sales-data.repo';
import { ExteriorLayoutQuality } from './entities/house-details.model';
import {
  CRITERIA_PRICE_IMPACTS,
  AMENITY_PRICE_IMPACTS,
  FEATURE_PRICE_IMPACTS,
  PARKING_PRICE_IMPACTS,
  calculateTotalPriceImpact,
} from './constants/price-impact-factors';
import type { CreatePropertyEstimateDto } from './property-estimate.service';
import { logger } from '../../utils/logger';

type SegmentBounds = {
  A: [number, number];
  B: [number, number][];
  C: [number, number][];
  D: [number, number][];
};

export class PropertyEstimateValuationService {
  private cityBlockSalesRepo: CityBlockSalesDataRepo;
  private static readonly MIN_RECORDS_PER_SEGMENT = 5;

  constructor() {
    this.cityBlockSalesRepo = new CityBlockSalesDataRepo();
  }

  async calculatePrice(
    dto: CreatePropertyEstimateDto
  ): Promise<{ basePricePerSqM: number; estimatedPrice: number }> {
    let basePricePerSqM =
      (await this.getPricePerSqMFromSegmentValuation(
        dto.locationCode,
        dto.type,
        dto.area
      )) ?? null;

    if (!basePricePerSqM) {
      basePricePerSqM = await this.getPricePerSqMFromSalesData(dto.locationCode, dto.type);
    }
    if (!basePricePerSqM) {
      basePricePerSqM = 2000;
    }

    basePricePerSqM *= 0.90;
    const savedBasePricePerSqM = basePricePerSqM;

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

    const criteriaImpact = calculateTotalPriceImpact(criteriaCodes, CRITERIA_PRICE_IMPACTS);
    const amenityImpact = calculateTotalPriceImpact(amenityCodes, AMENITY_PRICE_IMPACTS);
    const featureImpact = calculateTotalPriceImpact(featureCodes, FEATURE_PRICE_IMPACTS);
    const parkingImpact = calculateTotalPriceImpact(parkingCodes, PARKING_PRICE_IMPACTS);
    const totalPriceImpactPercent = criteriaImpact + amenityImpact + featureImpact + parkingImpact;
    const priceMultiplier = 1 + totalPriceImpactPercent / 100;

    const bedroomMultiplier = 1 + (dto.bedrooms - 2) * 0.1;
    const apartmentFloorMultiplier = this.getApartmentFloorMultiplier(
      dto.type,
      dto.apartmentElevator,
      dto.apartmentFloor
    );
    const landAreaMultiplier = this.getLandAreaMultiplier(dto.type, dto.landSize);
    const exteriorLayoutMultiplier = this.getExteriorLayoutMultiplier(
      dto.type,
      dto.exteriorLayoutQuality
    );
    const structuralMultiplier = this.getStructuralMultiplier(
      dto.type,
      dto.semiDetached,
      dto.sharedWalls
    );
    const conditionMultiplier = this.getConditionMultiplier(dto.condition);

    const basePrice = savedBasePricePerSqM * dto.area;
    const rawPrice =
      basePrice *
      priceMultiplier *
      bedroomMultiplier *
      apartmentFloorMultiplier *
      landAreaMultiplier *
      exteriorLayoutMultiplier *
      structuralMultiplier *
      conditionMultiplier;

    const valuationLog = logger.child({ module: 'valuation' });
    valuationLog.info('Price calculation', { rawPrice });

    const roundedCenter = this.roundToNearest5000(rawPrice);
    valuationLog.info('Estimated price', { estimatedPrice: roundedCenter });

    return {
      basePricePerSqM: savedBasePricePerSqM,
      estimatedPrice: roundedCenter,
    };
  }

  getRangeWidthPercent(centerPrice: number): number {
    if (centerPrice <= 250_000) return 0.08;
    if (centerPrice <= 500_000) return 0.06;
    return 0.05;
  }

  private roundToNearest5000(value: number): number {
    return Math.round(value / 5000) * 5000;
  }

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

  private getStructuralMultiplier(
    propertyType: PropertyType,
    semiDetached?: boolean | null,
    sharedWalls?: 0 | 1 | 2 | null
  ): number {
    if (propertyType !== PropertyType.HOUSE) return 1.0;
    const walls = sharedWalls ?? (semiDetached ? 1 : 0);
    if (walls === 0) return 1.0;
    if (walls === 1) return 0.97;
    return 0.94;
  }

  private getIdparPrefixes(idpar: string): string[] {
    const prefixes: string[] = [];
    for (let len = idpar.length - 1; len >= 8; len--) {
      prefixes.push(idpar.slice(0, len));
    }
    return prefixes;
  }

  private getSegmentBounds(sbati: number): SegmentBounds {
    return {
      A: [sbati * 0.8, sbati * 1.2],
      B: [
        [sbati * 0.7, sbati * 0.8],
        [sbati * 1.2, sbati * 1.3],
      ],
      C: [
        [sbati * 0.6, sbati * 0.7],
        [sbati * 1.3, sbati * 1.4],
      ],
      D: [
        [sbati * 0.5, sbati * 0.6],
        [sbati * 1.4, sbati * 1.5],
      ],
    };
  }

  private assignToSegments<T extends { sbati: number }>(
    records: T[],
    bounds: SegmentBounds
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

  private avgPricePerSqM(records: { price: number; sbati: number }[]): number {
    if (records.length === 0) return 0;
    const sum = records.reduce(
      (acc, r) => acc + Number(r.price) / Math.max(1, Number(r.sbati)),
      0
    );
    return sum / records.length;
  }

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

  private basePriceFromSegments(
    records: { sbati: number; price: number }[],
    bounds: SegmentBounds
  ): number | null {
    const { A, B, C, D } = this.assignToSegments(records, bounds);
    const min = PropertyEstimateValuationService.MIN_RECORDS_PER_SEGMENT;
    if (A.length < min || B.length < min || C.length < min || D.length < min) {
      return null;
    }
    const avgA = this.avgPricePerSqM(A);
    const avgB = this.avgPricePerSqM(B);
    const avgC = this.avgPricePerSqM(C);
    const avgD = this.avgPricePerSqM(D);
    return 0.5 * avgA + 0.25 * avgB + 0.15 * avgC + 0.1 * avgD;
  }

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

    let all = await this.fetchGroupRecords(locationCode, false, dvtType, start36, end36);
    if (all.length === 0) {
      const prefixesForInitial = this.getIdparPrefixes(locationCode);
      for (const pre of prefixesForInitial) {
        all = await this.fetchGroupRecords(pre, true, dvtType, start36, end36);
        if (all.length > 0) {
          logger.info('Valuation: expanded to prefix (36 months)', {
            prefix: pre,
            recordCount: all.length,
          });
          break;
        }
      }
      if (all.length === 0) {
        logger.info('Valuation: no records for idpar/type over 36 months', {
          locationCode,
          dvtType,
        });
        return null;
      }
    } else {
      logger.info('Valuation: raw fetch (36 months)', {
        locationCode,
        dvtType,
        sbati,
        recordCount: all.length,
      });
    }

    const bounds = this.getSegmentBounds(sbati);

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

    const minPerSeg = PropertyEstimateValuationService.MIN_RECORDS_PER_SEGMENT;
    const { A: a1, B: b1, C: c1, D: d1 } = this.assignToSegments(group1, bounds);
    const { A: a2, B: b2, C: c2, D: d2 } = this.assignToSegments(group2, bounds);
    const needExpand1 =
      a1.length < minPerSeg ||
      b1.length < minPerSeg ||
      c1.length < minPerSeg ||
      d1.length < minPerSeg;
    const needExpand2 =
      a2.length < minPerSeg ||
      b2.length < minPerSeg ||
      c2.length < minPerSeg ||
      d2.length < minPerSeg;
    if (needExpand1 || needExpand2) {
      logger.info('Valuation: expanding to idpar prefixes', { minPerSeg });
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
        logger.info('Valuation: exact idpar sufficient', {
          groupLabel,
          count: group.length,
          segments: { A: A.length, B: B.length, C: C.length, D: D.length },
        });
        return base;
      }

      for (const pre of prefixes) {
        const fetched = await this.fetchGroupRecords(pre, true, dvtType, start, end);
        const asObj = fetched.map((r) => ({
          sbati: Number(r.sbati),
          price: Number(r.price),
        }));
        base = this.basePriceFromSegments(asObj, bounds);
        if (base != null) {
          const { A, B, C, D } = this.assignToSegments(asObj, bounds);
          logger.info('Valuation: expanded to prefix', {
            groupLabel,
            prefix: pre,
            count: asObj.length,
            segments: { A: A.length, B: B.length, C: C.length, D: D.length },
          });
          return base;
        }
      }
      logger.info('Valuation: insufficient segments after all prefixes', {
        groupLabel,
        minPerSeg,
      });
      return null;
    };

    const base1 = await tryBase(group1, split18, end36, 'latest 18mo');
    const base2 = await tryBase(group2, start36, endGroup2, 'older 18mo');

    logger.info('Valuation: base prices', {
      base1: base1 != null ? base1.toFixed(2) : null,
      base2: base2 != null ? base2.toFixed(2) : null,
    });

    if (base1 != null && base2 != null) {
      const finalBase = base1 * 0.55 + base2 * 0.45;
      logger.info('Valuation: final base (both groups)', {
        finalBase: finalBase.toFixed(2),
        base1: base1.toFixed(2),
        base2: base2.toFixed(2),
      });
      return finalBase;
    }
    if (base1 != null) {
      logger.info('Valuation: final base (latest 18mo only)', {
        finalBase: base1.toFixed(2),
      });
      return base1;
    }
    if (base2 != null) {
      logger.info('Valuation: final base (older 18mo only)', {
        finalBase: base2.toFixed(2),
      });
      return base2;
    }
    logger.info('Valuation: final base null');
    return null;
  }

  private async getPricePerSqMFromSalesData(
    locationCode: string,
    propertyType: PropertyType
  ): Promise<number | null> {
    try {
      const aggregatedData =
        await this.cityBlockSalesRepo.getAggregatedDataByIdpar(locationCode);
      if (!aggregatedData) return null;

      let pricePerSqM: number | null = null;
      if (propertyType === PropertyType.APARTMENT) {
        if (aggregatedData.apartmentCount > 0 && aggregatedData.apartmentSbati > 0) {
          pricePerSqM = aggregatedData.apartmentPrice / aggregatedData.apartmentSbati;
        }
      } else if (propertyType === PropertyType.HOUSE) {
        if (aggregatedData.mansionCount > 0 && aggregatedData.mansionSbati > 0) {
          pricePerSqM = aggregatedData.mansionPrice / aggregatedData.mansionSbati;
        }
      }
      return pricePerSqM && pricePerSqM > 0 ? pricePerSqM : null;
    } catch (error) {
      logger.error('Error fetching price per sqm from sales data', {
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private getConditionMultiplier(condition?: string): number {
    if (!condition) return 1.0;
    const conditionMultipliers: { [key: string]: number } = {
      excellent: 1.12,
      good: 1.0,
      fair: 0.85,
      poor: 0.7,
      'needs renovation': 0.88,
    };
    return conditionMultipliers[condition.toLowerCase()] ?? 1.0;
  }

  private getApartmentFloorMultiplier(
    propertyType: PropertyType,
    hasElevator?: boolean | null,
    floorNumber?: number | null
  ): number {
    if (propertyType !== PropertyType.APARTMENT) return 1.0;
    if (floorNumber === null || floorNumber === undefined || floorNumber === 0) {
      return 1.0;
    }
    const hasElevatorValue = hasElevator === true;
    if (!hasElevatorValue) {
      if (floorNumber === 1) return 0.99;
      if (floorNumber === 2) return 0.97;
      if (floorNumber >= 3) return 0.92;
    } else {
      if (floorNumber === 1) return 1.01;
      if (floorNumber === 2) return 1.02;
      if (floorNumber >= 3) return 1.04;
    }
    return 1.0;
  }

  private getLandAreaMultiplier(
    propertyType: PropertyType,
    landSize?: number | null
  ): number {
    if (propertyType !== PropertyType.HOUSE) return 1.0;
    if (landSize === null || landSize === undefined) return 1.0;
    if (landSize < 150) return 0.96;
    if (landSize < 500) return 1.0;
    if (landSize < 1000) return 1.02;
    return 1.03;
  }
}
