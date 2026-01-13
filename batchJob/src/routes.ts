import { Express } from 'express';
import realEstateDataRoutes from './modules/real-estate-data/real-estate-data.routes';

export function mountRoutes(app: Express): void {
  app.use('/process-data', realEstateDataRoutes);
}