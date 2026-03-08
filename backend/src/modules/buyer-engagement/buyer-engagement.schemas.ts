import { z } from 'zod';

const uuidString = z.string().uuid();

export const clickBodySchema = z.object({
  propertyId: uuidString,
  budget: z.number().int().min(0),
  bedrooms: z.number().int().min(0),
  minSurfaceArea: z.number().int().min(0),
  pool: z.boolean().optional(),
  minLandArea: z.number().int().min(0).nullable().optional(),
});

export const propertyIdParamSchema = z.object({
  propertyId: uuidString,
});

export const interestedToggleBodySchema = z.object({
  budget: z.number().int().min(0),
  bedrooms: z.number().int().min(0),
  minSurfaceArea: z.number().int().min(0),
  pool: z.boolean().optional(),
  minLandArea: z.number().int().min(0).nullable().optional(),
});

export const batchCheckBodySchema = z.object({
  propertyIds: z.array(uuidString).min(1, 'At least one property ID is required'),
});

export type ClickBody = z.infer<typeof clickBodySchema>;
export type PropertyIdParam = z.infer<typeof propertyIdParamSchema>;
export type InterestedToggleBody = z.infer<typeof interestedToggleBodySchema>;
export type BatchCheckBody = z.infer<typeof batchCheckBodySchema>;
