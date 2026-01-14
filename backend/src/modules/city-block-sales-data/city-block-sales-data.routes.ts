import { Router, Request, Response } from 'express';
import { processRealEstateData } from './city-block-sales-data.service';
import { FetchDataParams } from './types';

const router = Router();

/**
 * POST /process-data
 * Process real estate data and return aggregated map
 * 
 * Body: {
 *   anneemut_min: number,
 *   anneemut_max: number,
 *   code_insee: string
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { anneemut_min, anneemut_max, code_insee } = req.body;

    // Validate input
    if (!anneemut_min || !anneemut_max || !code_insee) {
      return res.status(400).json({
        message: 'Missing required parameters',
        required: ['anneemut_min', 'anneemut_max', 'code_insee'],
      });
    }

    // Validate types
    if (typeof anneemut_min !== 'number' || typeof anneemut_max !== 'number') {
      return res.status(400).json({
        message: 'anneemut_min and anneemut_max must be numbers',
      });
    }

    if (typeof code_insee !== 'string') {
      return res.status(400).json({
        message: 'code_insee must be a string',
      });
    }

    const params: FetchDataParams = {
      anneemut_min,
      anneemut_max,
      code_insee,
    };

    const result = await processRealEstateData(params);

    // Transform result for response (extract just the data part for backward compatibility)
    const responseData: Record<string, any> = {};
    for (const [section, entry] of Object.entries(result)) {
      responseData[section] = entry.data;
    }

    res.json({
      success: true,
      data: responseData,
      sectionsCount: Object.keys(result).length,
      message: 'Data processed and saved to database successfully',
    });
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({
      message: 'Failed to process data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
