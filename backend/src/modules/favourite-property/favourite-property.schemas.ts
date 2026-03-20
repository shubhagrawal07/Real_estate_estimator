import { z } from 'zod';

export const propertyIdParamSchema = z.object({
  propertyId: z.string().min(1),
});

export const batchCheckBodySchema = z.object({
  propertyIds: z.array(z.string()),
});
