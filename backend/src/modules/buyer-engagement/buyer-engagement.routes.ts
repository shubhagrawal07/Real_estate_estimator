import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
  recordClick,
  toggleInterested,
  checkBatch,
} from './buyer-engagement.controller';
import { asyncHandler } from '../../middleware/error.middleware';
import {
  validateBody,
  validateParams,
} from '../../middleware/validate-zod.middleware';
import {
  clickBodySchema,
  propertyIdParamSchema,
  interestedToggleBodySchema,
  batchCheckBodySchema,
} from './buyer-engagement.schemas';

const router = Router();

router.post(
  '/click',
  authenticateToken,
  validateBody(clickBodySchema),
  asyncHandler(recordClick)
);
router.post(
  '/batch/check',
  authenticateToken,
  validateBody(batchCheckBodySchema),
  asyncHandler(checkBatch)
);
router.post(
  '/:propertyId/interested',
  authenticateToken,
  validateParams(propertyIdParamSchema),
  validateBody(interestedToggleBodySchema),
  asyncHandler(toggleInterested)
);

export default router;
