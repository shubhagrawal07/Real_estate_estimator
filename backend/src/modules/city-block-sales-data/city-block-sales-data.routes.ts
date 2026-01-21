/**
 * City Block Sales Data Routes
 * API endpoints for processing real estate data
 */

import { Router, Request, Response } from 'express';
import { processRealEstateData } from './city-block-sales-data.service';
import { FetchDataParams } from './types';

const router = Router();

/**
 * POST /process-data
 * Processes real estate data from DVF API and saves to database
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
 *   recordsCount: number,
 *   message: string
 * }
 */
router.post('/', async (req: Request, res: Response) => {
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

    const records = await processRealEstateData(params);

    // Return success response
    res.json({
      success: true,
      recordsCount: records.length,
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
