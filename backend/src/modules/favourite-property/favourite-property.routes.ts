import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
  addFavourite,
  removeFavourite,
  getUserFavourites,
  checkFavourite,
  checkBatch,
} from './favourite-property.controller';
import { asyncHandler } from '../../middleware/error.middleware';
import { validateBody, validateParams } from '../../middleware/validate-zod.middleware';
import { propertyIdParamSchema, batchCheckBodySchema } from './favourite-property.schemas';

const router = Router();

router.get('/user/favourites', authenticateToken, asyncHandler(getUserFavourites));
router.post('/batch/check', authenticateToken, validateBody(batchCheckBodySchema), asyncHandler(checkBatch));
router.post('/:propertyId', authenticateToken, validateParams(propertyIdParamSchema), asyncHandler(addFavourite));
router.delete('/:propertyId', authenticateToken, validateParams(propertyIdParamSchema), asyncHandler(removeFavourite));
router.get('/:propertyId', authenticateToken, validateParams(propertyIdParamSchema), asyncHandler(checkFavourite));

export default router;
