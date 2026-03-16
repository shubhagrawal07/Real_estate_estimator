import { Response } from 'express';
import { SellerAlertService } from './seller-alert.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../utils/AppError';

const sellerAlertService = new SellerAlertService();

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.userId) {
    throw new AppError('User ID not found', 401);
  }
  return req.userId;
}

export async function listAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const alerts = await sellerAlertService.listForUser(userId);
  res.json(alerts);
}

export async function markAlertRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const { id } = req.params as { id: string };
  const deleted = await sellerAlertService.markAsReadAndDelete(id, userId);
  if (!deleted) {
    throw new AppError('Alert not found or access denied', 404);
  }
  res.status(204).send();
}
