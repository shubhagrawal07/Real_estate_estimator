import { z } from 'zod';
import { BuyerIntentType } from './buyer-intent.model';

const intentTypeSchema = z.nativeEnum(BuyerIntentType);

export const createBuyerIntentBodySchema = z
  .object({
    propertyId: z.string().uuid(),
    intentType: intentTypeSchema,
    message: z.string().max(300).optional(),
    budget: z.number().int().nonnegative().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.intentType === BuyerIntentType.QUESTION) {
      const m = val.message?.trim() ?? '';
      if (m.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'message is required for QUESTION intent',
          path: ['message'],
        });
      }
    }
  });

export type CreateBuyerIntentBody = z.infer<typeof createBuyerIntentBodySchema>;

export const batchBuyerIntentBodySchema = z.object({
  propertyIds: z.array(z.string().uuid()).min(1).max(200),
});

export type BatchBuyerIntentBody = z.infer<typeof batchBuyerIntentBodySchema>;
