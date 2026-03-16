import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { listAlerts, markAlertRead } from './seller-alert.controller';
import { asyncHandler } from '../../middleware/error.middleware';
import { validateParams } from '../../middleware/validate-zod.middleware';
import { idParamSchema } from './seller-alert.schemas';

const router = Router();

router.get('/', authenticateToken, asyncHandler(listAlerts));
router.patch(
  '/:id/read',
  authenticateToken,
  validateParams(idParamSchema),
  asyncHandler(markAlertRead)
);

export default router;
