import { Router } from 'express';
import { validatePropertyEstimate } from '../../middleware/validate.middleware';
import { optionalAuth, authenticateToken } from '../../middleware/auth.middleware';
import {
  create,
  getMyEstimates,
  linkDrafts,
  findAll,
  findOne,
  recalculate,
  remove,
} from './property-estimate.controller';
import { asyncHandler } from '../../middleware/error.middleware';
import { validateBody, validateParams } from '../../middleware/validate-zod.middleware';
import { idParamSchema, linkDraftsBodySchema } from './property-estimate.schemas';

const router = Router();

router.post('/', optionalAuth, validatePropertyEstimate, asyncHandler(create));
router.get('/user/my-estimates', authenticateToken, asyncHandler(getMyEstimates));
router.post('/link-drafts', authenticateToken, validateBody(linkDraftsBodySchema), asyncHandler(linkDrafts));
router.get('/', asyncHandler(findAll));
router.put('/:id/recalculate', validateParams(idParamSchema), asyncHandler(recalculate));
router.get('/:id', validateParams(idParamSchema), asyncHandler(findOne));
router.delete('/:id', authenticateToken, validateParams(idParamSchema), asyncHandler(remove));

export default router;
