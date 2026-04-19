import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { validateBody, validateParams } from '../../middleware/validate-zod.middleware';
import { createSellerIntent, getDvfPreview } from './seller-intent.controller';
import { createSellerIntentBodySchema, propertyIdParamSchema } from './seller-intent.schemas';

const router = Router();

router.post(
  '/',
  authenticateToken,
  validateBody(createSellerIntentBodySchema),
  asyncHandler(createSellerIntent)
);

router.get(
  '/dvf-preview/:propertyId',
  validateParams(propertyIdParamSchema),
  asyncHandler(getDvfPreview)
);

export default router;
