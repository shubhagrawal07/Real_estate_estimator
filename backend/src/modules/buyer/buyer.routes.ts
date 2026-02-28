import { Router } from 'express';
import { BuyerService, BuyerSearchDto } from './buyer.service';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { PropertyType } from '../property-estimate/property-estimate.model';

const router = Router();
const buyerService = new BuyerService();

/**
 * POST /buyer/search
 * Search for properties based on buyer criteria
 * Requires authentication
 */
router.post('/search', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { propertyType, cityInseeCode, cadastralSection, budget, bedrooms } = req.body;

    // Validate required fields
    if (!propertyType || !cityInseeCode || !cadastralSection || !budget || bedrooms === undefined) {
      return res.status(400).json({
        message: 'Missing required fields: propertyType, cityInseeCode, cadastralSection, budget, bedrooms',
      });
    }

    // Validate property type
    if (propertyType !== PropertyType.APARTMENT && propertyType !== PropertyType.HOUSE) {
      return res.status(400).json({
        message: `propertyType must be either "${PropertyType.APARTMENT}" or "${PropertyType.HOUSE}"`,
      });
    }

    // Validate city INSEE code (should be 5 digits)
    if (!/^\d{5}$/.test(cityInseeCode)) {
      return res.status(400).json({
        message: 'cityInseeCode must be a 5-digit number',
      });
    }

    // Validate cadastral section (should be 2 alphabetic characters)
    if (!/^[A-Z]{2}$/.test(cadastralSection.toUpperCase())) {
      return res.status(400).json({
        message: 'cadastralSection must be 2 alphabetic characters (will be converted to uppercase)',
      });
    }

    // Validate budget (should be positive number)
    if (typeof budget !== 'number' || budget <= 0) {
      return res.status(400).json({
        message: 'budget must be a positive number',
      });
    }

    // Validate bedrooms (should be non-negative integer)
    if (!Number.isInteger(bedrooms) || bedrooms < 0) {
      return res.status(400).json({
        message: 'bedrooms must be a non-negative integer',
      });
    }

    const searchDto: BuyerSearchDto = {
      propertyType: propertyType as PropertyType,
      cityInseeCode,
      cadastralSection: cadastralSection.toUpperCase(),
      budget: Number(budget),
      bedrooms: Number(bedrooms),
    };

    const rankedProperties = await buyerService.searchProperties(searchDto);

    res.json({
      properties: rankedProperties,
      count: rankedProperties.length,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to search properties',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

