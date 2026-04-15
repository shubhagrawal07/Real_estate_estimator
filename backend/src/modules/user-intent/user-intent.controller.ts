import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../utils/AppError';
import { UserIntentService } from './user-intent.service';
import type { CreateUserIntentBody } from './user-intent.schemas';

const userIntentService = new UserIntentService();

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.userId) {
    throw new AppError('Access token required', 401);
  }
  return req.userId;
}

export async function createUserIntent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateUserIntentBody;
  const intent = await userIntentService.createIntent(userId, body);
  res.status(201).json({
    success: true,
    data: {
      id: intent.id,
      userId: intent.userId,
      propertyId: intent.propertyId,
      profileType: intent.profileType,
      intentType: intent.intentType,
      targetPrice: intent.targetPrice,
      timeline: intent.timeline,
      sellPreference: intent.sellPreference,
      agentId: intent.agentId,
      createdAt: intent.createdAt,
      notifSent: intent.notifSent,
    },
  });
}

export async function getDvfPreview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const propertyId = (req.params as { propertyId: string }).propertyId;
  const preview = await userIntentService.getDvfPreview(propertyId);
  res.json({ success: true, data: preview });
}
