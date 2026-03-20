import { Response } from 'express';
import { processRealEstateData } from './city-block-sales-data.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { UserRole } from '../user/user.model';
import { AppError } from '../../utils/AppError';
import type { ProcessDataBody } from './city-block-sales-data.schemas';

export async function processData(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (req.userRole !== UserRole.ADMIN) {
    throw new AppError('Access denied. Admin role required.', 403);
  }
  const params = req.body as ProcessDataBody;
  const { totalRecords, savedRecords } = await processRealEstateData(params);
  res.json({
    success: true,
    totalRecords,
    savedRecords,
    message: 'Data processed and saved to database successfully',
  });
}
