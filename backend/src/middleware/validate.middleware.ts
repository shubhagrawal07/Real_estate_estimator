import { validateBody } from './validate-zod.middleware';
import { createPropertyEstimateBodySchema } from '../modules/property-estimate/property-estimate.schemas';

/**
 * Validates request body for POST /property-estimate (create estimate).
 * Uses Zod schema; on failure passes AppError(400) to next.
 */
export const validatePropertyEstimate = validateBody(createPropertyEstimateBodySchema);
