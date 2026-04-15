import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { validateBody, validateParams } from '../../middleware/validate-zod.middleware';
import { createUserIntent, getDvfPreview } from './user-intent.controller';
import { createUserIntentBodySchema, propertyIdParamSchema } from './user-intent.schemas';

const router = Router();

router.post(
  '/',
  authenticateToken,
  validateBody(createUserIntentBodySchema),
  asyncHandler(createUserIntent)
);

router.get(
  '/dvf-preview/:propertyId',
  validateParams(propertyIdParamSchema),
  asyncHandler(getDvfPreview)
);

export default router;
