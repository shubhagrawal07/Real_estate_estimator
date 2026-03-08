import { Response } from 'express';
import { FavouritePropertyService } from './favourite-property.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../utils/AppError';

const favouritePropertyService = new FavouritePropertyService();

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.userId) {
    throw new AppError('User ID not found', 401);
  }
  return req.userId;
}

export async function addFavourite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const propertyId = (req.params as { propertyId: string }).propertyId;

  const result = await favouritePropertyService.addFavourite(userId, propertyId);
  if (result.alreadyExists) {
    res.status(200).json({
      message: 'Property already in favorites',
      isFavourite: true,
    });
    return;
  }
  res.status(201).json({
    message: 'Property added to favorites',
    isFavourite: true,
    favourite: result.favourite,
  });
}

export async function removeFavourite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const propertyId = (req.params as { propertyId: string }).propertyId;

  const deleted = await favouritePropertyService.removeFavourite(userId, propertyId);
  if (!deleted) {
    throw new AppError('Favorite not found', 404);
  }
  res.json({
    message: 'Property removed from favorites',
    isFavourite: false,
  });
}

export async function getUserFavourites(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const properties = await favouritePropertyService.getUserFavouritesWithDetails(userId);
  res.json(properties);
}

export async function checkFavourite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const propertyId = (req.params as { propertyId: string }).propertyId;

  const isFavourite = await favouritePropertyService.isFavourite(userId, propertyId);
  res.json({ isFavourite });
}

export async function checkBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const { propertyIds } = req.body as { propertyIds: string[] };

  const favourites = await favouritePropertyService.checkBatch(userId, propertyIds);
  res.json({ favourites });
}
