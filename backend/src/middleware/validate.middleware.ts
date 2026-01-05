import { Request, Response, NextFunction } from 'express';
import { PropertyType, OwnershipType, Deadline } from '../modules/property-estimate/property-estimate.model';

export interface CreatePropertyEstimateDto {
  address: string;
  postalCode: number;
  department: string;
  municipality: string;
  cadastralSection: string;
  type: PropertyType;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  hasBalcony: boolean;
  hasParking: boolean;
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
    postalCode, 
    department, 
    municipality, 
    cadastralSection,
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

  if (typeof postalCode !== 'number' || postalCode < 1000 || postalCode > 99999) {
    errors.push('Postal Code is required and must be a valid number');
  }

  if (!department || typeof department !== 'string' || department.trim().length === 0) {
    errors.push('Department is required and must be a non-empty string');
  }

  if (!municipality || typeof municipality !== 'string' || municipality.trim().length === 0) {
    errors.push('Municipality is required and must be a non-empty string');
  }

  if (!cadastralSection || typeof cadastralSection !== 'string' || cadastralSection.trim().length === 0) {
    errors.push('Cadastral Section is required and must be a non-empty string');
  }

  if (!type || !Object.values(PropertyType).includes(type)) {
    errors.push(`Type is required and must be one of: ${Object.values(PropertyType).join(', ')}`);
  }

  if (typeof area !== 'number' || area < 1) {
    errors.push('Area is required and must be a number greater than 0');
  }

  if (typeof bedrooms !== 'number' || bedrooms < 1) {
    errors.push('Bedrooms is required and must be a number greater than or equal to 1');
  }

  if (typeof bathrooms !== 'number' || bathrooms < 1) {
    errors.push('Bathrooms is required and must be a number greater than or equal to 1');
  }

  if (typeof floors !== 'number' || floors < 1) {
    errors.push('Floors is required and must be a number greater than or equal to 1');
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

  if (errors.length > 0) {
    res.status(400).json({ 
      message: 'Validation failed',
      errors 
    });
    return;
  }

  next();
}
