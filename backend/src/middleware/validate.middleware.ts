import { Request, Response, NextFunction } from 'express';
import {
  PropertyType,
  OwnershipType,
  Deadline,
  BuildingAge,
} from '../modules/property-estimate/property-estimate.model';
import { OutdoorSpace } from '../modules/property-estimate/entities/apartment-details.model';
import { PoolOption } from '../modules/property-estimate/entities/house-details.model';

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

export function validatePropertyEstimate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { 
    address, 
    locationCode,
    longitude,
    latitude,
    type,
    area,
    bedrooms,
    bathrooms,
    floors,
    hasBalcony,
    hasParking,
    ownershipType,
    deadline,
    condition
  } = req.body;
  const errors: string[] = [];

  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    errors.push('Address is required and must be a non-empty string');
  }

  if (!locationCode || typeof locationCode !== 'string' || locationCode.trim().length === 0) {
    errors.push('Location Code is required and must be a non-empty string');
  } else if (locationCode.length !== 10) {
    errors.push('Location Code must be exactly 10 characters (5 digits for code_insee + 3 digits padding + 2 characters for cadastral section)');
  } else {
    // Validate format: first 5 characters should be numeric (code_insee)
    const codeInsee = locationCode.substring(0, 5);
    const padding = locationCode.substring(5, 8);
    if (!/^\d{5}$/.test(codeInsee)) {
      errors.push('Location Code must start with 5 digits (code_insee)');
    }
    if (!/^\d{3}$/.test(padding)) {
      errors.push('Location Code must have 3 numeric padding digits after code_insee');
    }
  }

  if (!type || !Object.values(PropertyType).includes(type)) {
    errors.push(`Type is required and must be one of: ${Object.values(PropertyType).join(', ')}`);
  }

  if (typeof area !== 'number' || area < 1) {
    errors.push('Area is required and must be a number greater than 0');
  }

  if (typeof bedrooms !== 'number' || bedrooms < 0) {
    errors.push('Bedrooms is required and must be a number greater than or equal to 0');
  }

  if (typeof bathrooms !== 'number' || bathrooms < 1) {
    errors.push('Bathrooms is required and must be a number greater than or equal to 1');
  }

  if (typeof floors !== 'number' || floors < 0) {
    errors.push('Floors is required and must be a number greater than or equal to 0');
  }

  if (typeof hasBalcony !== 'boolean') {
    errors.push('Has Balcony is required and must be a boolean');
  }

  if (typeof hasParking !== 'boolean') {
    errors.push('Has Parking is required and must be a boolean');
  }

  if (!ownershipType || !Object.values(OwnershipType).includes(ownershipType)) {
    errors.push(`Ownership Type is required and must be one of: ${Object.values(OwnershipType).join(', ')}`);
  }

  if (!deadline || !Object.values(Deadline).includes(deadline)) {
    errors.push(`Deadline is required and must be one of: ${Object.values(Deadline).join(', ')}`);
  }

  if (condition !== undefined && condition !== null && condition !== '' && typeof condition !== 'string') {
    errors.push('Condition must be a string if provided');
  }

  if (longitude !== undefined && longitude !== null && (typeof longitude !== 'number' || longitude < -180 || longitude > 180)) {
    errors.push('Longitude must be a number between -180 and 180 if provided');
  }

  if (latitude !== undefined && latitude !== null && (typeof latitude !== 'number' || latitude < -90 || latitude > 90)) {
    errors.push('Latitude must be a number between -90 and 90 if provided');
  }

  if (errors.length > 0) {
    res.status(400).json({ 
      message: 'Validation failed',
      errors 
    });
    return;
  }

  next();
}
