import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { processData } from './city-block-sales-data.controller';
import { asyncHandler } from '../../middleware/error.middleware';
import { validateBody } from '../../middleware/validate-zod.middleware';
import { processDataBodySchema } from './city-block-sales-data.schemas';

const router = Router();

router.post('/', authenticateToken, validateBody(processDataBodySchema), asyncHandler(processData));

export default router;
