import { Response } from 'express';
import { BuyerSearchService } from './buyer-search.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../utils/AppError';
import type { BuyerSearchBody } from './buyer-search.schemas';

const buyerSearchService = new BuyerSearchService();

export async function search(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    throw new AppError('User ID not found', 401);
  }
  const body = req.body as BuyerSearchBody;
  const rankedProperties = await buyerSearchService.searchProperties(body, req.userId);
  res.json({
    properties: rankedProperties,
    count: rankedProperties.length,
  });
}
