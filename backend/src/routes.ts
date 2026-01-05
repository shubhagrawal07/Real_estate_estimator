import { Express } from 'express';
import propertyEstimateRoutes from './modules/property-estimate/property-estimate.routes';

export function mountRoutes(app: Express): void {
  app.use('/property-estimate', propertyEstimateRoutes);
}
