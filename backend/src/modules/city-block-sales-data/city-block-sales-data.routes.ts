/**
 * City Block Sales Data Routes
 * API endpoints for processing real estate data
 */

import { Router, Request, Response } from 'express';
import { processRealEstateData } from './city-block-sales-data.service';
import { FetchDataParams } from './types';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { UserRole } from '../user/user.model';

const router = Router();

/**
 * POST /process-data
 * Processes real estate data from DVF API and saves to database
 * Requires admin authentication
 * 
 * Request Body:
 * {
 *   anneemut_min: number,    // Minimum mutation year
 *   anneemut_max: number,    // Maximum mutation year
 *   code_insee: string       // INSEE code (municipality identifier)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   totalRecords: number,
 *   savedRecords: number,
 *   message: string
 * }
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // Check if user is admin
  if (req.userRole !== UserRole.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }
  try {
    const { anneemut_min, anneemut_max, code_insee } = req.body;

    // Validate required parameters
    if (!anneemut_min || !anneemut_max || !code_insee) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
        required: ['anneemut_min', 'anneemut_max', 'code_insee'],
      });
    }

    // Validate parameter types
    if (typeof anneemut_min !== 'number' || typeof anneemut_max !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'anneemut_min and anneemut_max must be numbers',
      });
    }

    if (typeof code_insee !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'code_insee must be a string',
      });
    }

    // Process data
    const params: FetchDataParams = {
      anneemut_min,
      anneemut_max,
      code_insee,
    };

    const { totalRecords, savedRecords } = await processRealEstateData(params);

    // Return success response
    res.json({
      success: true,
      totalRecords,
      savedRecords,
      message: 'Data processed and saved to database successfully',
    });
  } catch (error) {
    console.error('[Routes] Error processing data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
