import { Response } from 'express';
import { PropertyEstimateService } from './property-estimate.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { serializeEstimate, serializeEstimates } from './serialize-estimate.util';
import { AppError } from '../../utils/AppError';

const propertyEstimateService = new PropertyEstimateService();

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.userId) {
    throw new AppError('User ID not found', 401);
  }
  return req.userId;
}

export async function create(req: AuthenticatedRequest, res: Response): Promise<void> {
  const estimate = await propertyEstimateService.createEstimate(req.body, req.userId);
  res.status(201).json(serializeEstimate(estimate));
}

export async function getMyEstimates(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const estimates = await propertyEstimateService.getEstimatesByUserId(userId);
  res.json(serializeEstimates(estimates));
}

export async function linkDrafts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const { propertyIds } = req.body as { propertyIds: string[] };
  const updatedEstimates = await propertyEstimateService.linkDraftEstimatesToUser(propertyIds, userId);
  res.json({
    message: `Linked ${updatedEstimates.length} estimates to user`,
    estimates: serializeEstimates(updatedEstimates),
  });
}

export async function findAll(_req: AuthenticatedRequest, res: Response): Promise<void> {
  const estimates = await propertyEstimateService.findAll();
  res.json(serializeEstimates(estimates));
}

export async function findOne(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = (req.params as { id: string }).id;
  const estimate = await propertyEstimateService.findOne(id);
  if (!estimate) {
    throw new AppError('Estimate not found', 404);
  }
  res.json(serializeEstimate(estimate));
}

export async function recalculate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = (req.params as { id: string }).id;
  const updatedEstimate = await propertyEstimateService.recalculateEstimate(id);
  if (!updatedEstimate) {
    throw new AppError('Estimate not found', 404);
  }
  res.json(serializeEstimate(updatedEstimate));
}

export async function remove(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const id = (req.params as { id: string }).id;
  const estimate = await propertyEstimateService.findOne(id);
  if (!estimate) {
    throw new AppError('Estimate not found', 404);
  }
  if (estimate.userId !== userId) {
    throw new AppError('You do not have permission to delete this estimate', 403);
  }
  const deleted = await propertyEstimateService.deleteEstimate(id);
  if (!deleted) {
    throw new AppError('Estimate not found', 404);
  }
  res.json({ message: 'Estimate deleted successfully' });
}

export async function updateEngagement(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const id = (req.params as { id: string }).id;
  const body = req.body as {
    feedback?: 'accurate' | 'high' | 'low' | 'inaccurate';
    buyerTracking?: boolean;
  };
  const estimate = await propertyEstimateService.updateEngagement(id, userId, {
    feedback: body.feedback,
    buyerTracking: body.buyerTracking,
  });
  if (!estimate) {
    throw new AppError('Estimate not found or access denied', 404);
  }
  res.json(serializeEstimate(estimate));
}
