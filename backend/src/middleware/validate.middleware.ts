import { Request, Response, NextFunction } from 'express';

export interface CreatePropertyEstimateDto {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt?: number;
}

export function validatePropertyEstimate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { address, city, state, zipCode, squareFeet, bedrooms, bathrooms, yearBuilt } = req.body;
  const errors: string[] = [];

  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    errors.push('Address is required and must be a non-empty string');
  }

  if (!city || typeof city !== 'string' || city.trim().length === 0) {
    errors.push('City is required and must be a non-empty string');
  }

  if (!state || typeof state !== 'string' || state.trim().length === 0) {
    errors.push('State is required and must be a non-empty string');
  }

  if (!zipCode || typeof zipCode !== 'string' || !/^\d{5}$/.test(zipCode)) {
    errors.push('ZIP Code is required and must be a 5-digit string');
  }

  if (typeof squareFeet !== 'number' || squareFeet < 1) {
    errors.push('Square Feet is required and must be a number greater than 0');
  }

  if (typeof bedrooms !== 'number' || bedrooms < 0) {
    errors.push('Bedrooms is required and must be a number greater than or equal to 0');
  }

  if (typeof bathrooms !== 'number' || bathrooms < 0) {
    errors.push('Bathrooms is required and must be a number greater than or equal to 0');
  }

  if (yearBuilt !== undefined) {
    const currentYear = new Date().getFullYear();
    if (typeof yearBuilt !== 'number' || yearBuilt < 1800 || yearBuilt > currentYear) {
      errors.push(`Year Built must be a number between 1800 and ${currentYear}`);
    }
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
