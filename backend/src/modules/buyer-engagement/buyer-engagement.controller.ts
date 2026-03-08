import { Response } from 'express';
import { BuyerEngagementService } from './buyer-engagement.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../utils/AppError';
import type { ClickBody, InterestedToggleBody, BatchCheckBody } from './buyer-engagement.schemas';

const buyerEngagementService = new BuyerEngagementService();

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.userId) {
    throw new AppError('User ID not found', 401);
  }
  return req.userId;
}

export async function recordClick(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as ClickBody;

  const record = await buyerEngagementService.recordClick(userId, body.propertyId, {
    budget: body.budget,
    bedrooms: body.bedrooms,
    minSurfaceArea: body.minSurfaceArea,
    pool: body.pool,
    minLandArea: body.minLandArea,
  });
  res.status(200).json({
    success: true,
    data: record,
  });
}

export async function toggleInterested(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = requireUserId(req);
  const { propertyId } = req.params as { propertyId: string };
  const body = req.body as InterestedToggleBody;

  const record = await buyerEngagementService.toggleInterested(userId, propertyId, {
    budget: body.budget,
    bedrooms: body.bedrooms,
    minSurfaceArea: body.minSurfaceArea,
    pool: body.pool,
    minLandArea: body.minLandArea,
  });
  res.status(200).json({
    success: true,
    data: record,
  });
}

export async function checkBatch(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = requireUserId(req);
  const { propertyIds } = req.body as BatchCheckBody;

  const engagements = await buyerEngagementService.getBatch(userId, propertyIds);
  res.status(200).json({
    success: true,
    data: { engagements },
  });
}
