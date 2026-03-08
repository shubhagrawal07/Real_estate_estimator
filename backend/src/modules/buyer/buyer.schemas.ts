import { z } from 'zod';
import { PropertyType } from '../property-estimate/property-estimate.model';

const MIN_AREA = 0;
const MAX_AREA = 1000;
const MIN_LAND_AREA = 0;
const MAX_LAND_AREA = 10000;

export const buyerSearchBodySchema = z.object({
  propertyType: z.nativeEnum(PropertyType),
  cityInseeCode: z.string().regex(/^\d{5}$/, 'cityInseeCode must be a 5-digit number'),
  cadastralSection: z
    .union([
      z.literal(''),
      z.string().regex(/^[A-Z]{2}$/i).transform((s) => s.toUpperCase()),
    ])
    .optional()
    .default(''),
  budget: z.number().positive('budget must be a positive number'),
  bedrooms: z.number().int().min(0, 'bedrooms must be a non-negative integer'),
  minSurfaceArea: z
    .number()
    .int()
    .min(MIN_AREA, `minSurfaceArea must be at least ${MIN_AREA}`)
    .max(MAX_AREA, `minSurfaceArea must be at most ${MAX_AREA}`)
    .default(0),
  pool: z.boolean().optional().default(false),
  minLandArea: z
    .number()
    .int()
    .min(MIN_LAND_AREA)
    .max(MAX_LAND_AREA)
    .optional(),
});

export type BuyerSearchBody = z.infer<typeof buyerSearchBodySchema>;
