import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
  recordClick,
  toggleInterested,
  checkBatch,
  updateFinancingStatus,
  resetEngagementHandler,
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
  updateFinancingBodySchema,
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
router.patch(
  '/:propertyId/financing-status',
  authenticateToken,
  validateParams(propertyIdParamSchema),
  validateBody(updateFinancingBodySchema),
  asyncHandler(updateFinancingStatus)
);
router.patch(
  '/:propertyId/reset-engagement',
  authenticateToken,
  validateParams(propertyIdParamSchema),
  asyncHandler(resetEngagementHandler)
);

export default router;
