import { Router } from 'express';
import { FavouritePropertyRepo } from './favourite-property.repo';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.middleware';

const router = Router();
const favouriteRepo = new FavouritePropertyRepo();

/**
 * POST /favourite-property/:propertyId
 * Add a property to user's favorites
 */
router.post('/:propertyId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User ID not found' });
    }

    const { propertyId } = req.params;

    if (!propertyId) {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    // Check if already favorited
    const existing = await favouriteRepo.findByUserAndProperty(req.userId, propertyId);
    if (existing) {
      return res.status(200).json({
        message: 'Property already in favorites',
        isFavourite: true,
      });
    }

    const favourite = await favouriteRepo.create(req.userId, propertyId);
    res.status(201).json({
      message: 'Property added to favorites',
      isFavourite: true,
      favourite,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to add property to favorites',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /favourite-property/:propertyId
 * Remove a property from user's favorites
 */
router.delete('/:propertyId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User ID not found' });
    }

    const { propertyId } = req.params;

    if (!propertyId) {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    const deleted = await favouriteRepo.delete(req.userId, propertyId);
    if (!deleted) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    res.json({
      message: 'Property removed from favorites',
      isFavourite: false,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to remove property from favorites',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /favourite-property/user/favourites
 * Get all favorite properties for the user with property details
 * Must be before /:propertyId route
 */
router.get('/user/favourites', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User ID not found' });
    }

    const favourites = await favouriteRepo.findByUserId(req.userId);
    
    // Import PropertyEstimateRepo to get property details
    const { PropertyEstimateRepo } = await import('../property-estimate/property-estimate.repo');
    const propertyRepo = new PropertyEstimateRepo();
    
    // Fetch property details for each favorite
    const propertiesWithDetails = await Promise.all(
      favourites.map(async (favourite) => {
        const property = await propertyRepo.findOne(favourite.propertyId);
        return property;
      })
    );

    // Filter out null properties and serialize
    const validProperties = propertiesWithDetails.filter(p => p !== null);
    
    // Serialize properties (remove circular refs)
    const serializeEstimate = (estimate: any): object => {
      const out = { ...estimate } as Record<string, unknown>;
      if (out.apartmentDetails && typeof out.apartmentDetails === 'object') {
        const apt = { ...(out.apartmentDetails as object) } as Record<string, unknown>;
        delete apt.property;
        out.apartmentDetails = apt;
      }
      if (out.houseDetails && typeof out.houseDetails === 'object') {
        const house = { ...(out.houseDetails as object) } as Record<string, unknown>;
        delete house.property;
        out.houseDetails = house;
      }
      return out;
    };

    res.json(validProperties.map(serializeEstimate));
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch favorite properties',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /favourite-property/:propertyId
 * Check if a property is favorited by the user
 * Must be after /user/favourites route
 */
router.get('/:propertyId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User ID not found' });
    }

    const { propertyId } = req.params;

    if (!propertyId) {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    const isFavourite = await favouriteRepo.isFavourite(req.userId, propertyId);
    res.json({ isFavourite });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to check favorite status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /favourite-property/batch/check
 * Check favorite status for multiple properties
 */
router.post('/batch/check', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User ID not found' });
    }

    const { propertyIds } = req.body;

    if (!Array.isArray(propertyIds)) {
      return res.status(400).json({ message: 'propertyIds must be an array' });
    }

    const favourites = await favouriteRepo.findByPropertyIds(req.userId, propertyIds);
    const favouriteMap: Record<string, boolean> = {};
    
    propertyIds.forEach((id: string) => {
      favouriteMap[id] = favourites.some(f => f.propertyId === id);
    });

    res.json({ favourites: favouriteMap });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to check favorite status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

