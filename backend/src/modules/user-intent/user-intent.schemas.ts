import { z } from 'zod';
import { ProfileType, IntentType, Timeline, SellPreference } from './user-intent.model';

const uuid = z.string().uuid();

export const createUserIntentBodySchema = z.object({
  propertyId: uuid,
  profileType: z.nativeEnum(ProfileType),
  intentType: z.nativeEnum(IntentType).optional().nullable(),
  targetPrice: z.number().int().positive().optional().nullable(),
  timeline: z.nativeEnum(Timeline).optional().nullable(),
  sellPreference: z.nativeEnum(SellPreference).optional().nullable(),
  /** When true, send agent notification (Flows A/B confirmation). */
  notifyAgent: z.boolean().optional().default(false),
});

export type CreateUserIntentBody = z.infer<typeof createUserIntentBodySchema>;

export const propertyIdParamSchema = z.object({
  propertyId: uuid,
});
