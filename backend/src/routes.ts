import { Express } from 'express';
import propertyEstimateRoutes from './modules/property-estimate/property-estimate.routes';
import authRoutes from './modules/auth/auth.routes';
import cityBlockSalesDataRoutes from './modules/city-block-sales-data/city-block-sales-data.routes';

export function mountRoutes(app: Express): void {
  app.use('/auth', authRoutes);
  app.use('/property-estimate', propertyEstimateRoutes);
  app.use('/process-data', cityBlockSalesDataRoutes);
}
