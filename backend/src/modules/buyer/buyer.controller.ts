import { Response } from 'express';
import { BuyerService } from './buyer.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../utils/AppError';
import type { BuyerSearchBody } from './buyer.schemas';

const buyerService = new BuyerService();

export async function search(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    throw new AppError('User ID not found', 401);
  }
  const body = req.body as BuyerSearchBody;
  const rankedProperties = await buyerService.searchProperties(body);
  res.json({
    properties: rankedProperties,
    count: rankedProperties.length,
  });
}
