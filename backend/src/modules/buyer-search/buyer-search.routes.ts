import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { search } from './buyer-search.controller';
import { asyncHandler } from '../../middleware/error.middleware';
import { validateBody } from '../../middleware/validate-zod.middleware';
import { buyerSearchBodySchema } from './buyer-search.schemas';

const router = Router();

router.post('/search', authenticateToken, validateBody(buyerSearchBodySchema), asyncHandler(search));

export default router;
