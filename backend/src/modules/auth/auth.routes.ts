import { Router } from 'express';
import { authenticateWithGoogle } from './auth.controller';
import { asyncHandler } from '../../middleware/error.middleware';
import { validateBody } from '../../middleware/validate-zod.middleware';
import { authGoogleBodySchema } from './auth.schemas';

const router = Router();

router.post('/google', validateBody(authGoogleBodySchema), asyncHandler(authenticateWithGoogle));

export default router;
