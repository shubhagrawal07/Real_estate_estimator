import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { validateBody } from '../../middleware/validate-zod.middleware';
import { batchBuyerIntentBodySchema, createBuyerIntentBodySchema } from './buyer-intent.schemas';
import { batchBuyerIntentFlags, createBuyerIntent } from './buyer-intent.controller';

const router = Router();

router.post(
  '/',
  authenticateToken,
  validateBody(createBuyerIntentBodySchema),
  asyncHandler(createBuyerIntent)
);

router.post(
  '/batch',
  authenticateToken,
  validateBody(batchBuyerIntentBodySchema),
  asyncHandler(batchBuyerIntentFlags)
);

export default router;
