import { z } from 'zod';
import {
  PropertyType,
  OwnershipType,
  Deadline,
  BuildingAge,
} from './property-estimate.model';
import { OutdoorSpace } from './entities/apartment-details.model';
import { PoolOption, ExteriorLayoutQuality } from './entities/house-details.model';

const locationCodeSchema = z
  .string()
  .length(10, 'Location Code must be exactly 10 characters')
  .refine((s) => /^\d{5}$/.test(s.slice(0, 5)), 'Location Code must start with 5 digits (code_insee)')
  .refine((s) => /^\d{3}$/.test(s.slice(5, 8)), 'Location Code must have 3 numeric padding digits after code_insee');

export const createPropertyEstimateBodySchema = z.object({
  address: z.string().min(1, 'Address is required and must be a non-empty string').transform((s) => s.trim()),
  locationCode: z.string().min(1).transform((s) => s.trim()).pipe(locationCodeSchema),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  buildingAge: z.nativeEnum(BuildingAge).default(BuildingAge.RECENT),
  type: z.nativeEnum(PropertyType),
  area: z.number().min(1, 'Area must be greater than 0'),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(1),
  floors: z.number().int().min(0),
  hasBalcony: z.boolean(),
  hasParking: z.boolean(),
  doubleLivingRoom: z.boolean().optional(),
  openKitchen: z.boolean().optional(),
  laundryCellar: z.boolean().optional(),
  apartmentElevator: z.boolean().nullable().optional(),
  apartmentFloor: z.number().int().nullable().optional(),
  outdoorSpace: z.nativeEnum(OutdoorSpace).optional(),
  landSize: z.number().int().nullable().optional(),
  semiDetached: z.boolean().nullable().optional(),
  sharedWalls: z.union([z.literal(0), z.literal(1), z.literal(2)]).nullable().optional(),
  exteriorLayoutQuality: z.nativeEnum(ExteriorLayoutQuality).nullable().optional(),
  poolOption: z.nativeEnum(PoolOption).optional(),
  criteriaCalm: z.boolean().optional(),
  criteriaBright: z.boolean().optional(),
  criteriaNearAmenities: z.boolean().optional(),
  criteriaNoVisAvis: z.boolean().optional(),
  criteriaWellConnected: z.boolean().optional(),
  amenityAirConditioning: z.boolean().optional(),
  amenityModernBathroom: z.boolean().optional(),
  amenityRecentKitchen: z.boolean().optional(),
  amenityFireplace: z.boolean().optional(),
  amenityElectricityStandard: z.boolean().optional(),
  amenityDoubleTripleGlazing: z.boolean().optional(),
  parkingGarage: z.boolean().optional(),
  parkingPrivate: z.boolean().optional(),
  parkingShared: z.boolean().optional(),
  parkingStreet: z.boolean().optional(),
  ownershipType: z.nativeEnum(OwnershipType),
  deadline: z.nativeEnum(Deadline),
  condition: z.string().optional(),
}).refine((d) => d.address.length > 0, { message: 'Address is required', path: ['address'] });

export const idParamSchema = z.object({
  id: z.string().min(1, 'Invalid ID format'),
});

export const linkDraftsBodySchema = z.object({
  propertyIds: z.array(z.string()).min(1, 'Property IDs array is required'),
});

export const feedbackSchema = z.enum(['accurate', 'high', 'low', 'inaccurate']);

export const updateEngagementBodySchema = z.object({
  feedback: feedbackSchema.optional(),
  buyerTracking: z.boolean().optional(),
  triggerPrice: z.number().min(0).optional(),
  engagementDelta: z.number().int().min(0).optional(),
});

export type UpdateEngagementBody = z.infer<typeof updateEngagementBodySchema>;
