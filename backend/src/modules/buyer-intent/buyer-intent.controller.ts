import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../utils/AppError';
import { BuyerIntentService } from './buyer-intent.service';
import type { BatchBuyerIntentBody, CreateBuyerIntentBody } from './buyer-intent.schemas';

const buyerIntentService = new BuyerIntentService();

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.userId) {
    throw new AppError('Access token required', 401);
  }
  return req.userId;
}

export async function createBuyerIntent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateBuyerIntentBody;
  const intent = await buyerIntentService.createIntent(userId, body);
  res.status(201).json({
    success: true,
    data: {
      id: intent.id,
      userId: intent.userId,
      propertyId: intent.propertyId,
      intentType: intent.intentType,
      notifSent: intent.notifSent,
      budget: intent.budget,
      message: intent.message,
      createdAt: intent.createdAt,
    },
  });
}

export async function batchBuyerIntentFlags(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const { propertyIds } = req.body as BatchBuyerIntentBody;
  const map = await buyerIntentService.getBatchFlags(userId, propertyIds);
  res.json({ success: true, data: map });
}
