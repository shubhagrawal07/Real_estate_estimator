import { Express } from 'express';
import propertyEstimateRoutes from './modules/property-estimate/property-estimate.routes';
import authRoutes from './modules/auth/auth.routes';
import cityBlockSalesDataRoutes from './modules/city-block-sales-data/city-block-sales-data.routes';
import buyerSearchRoutes from './modules/buyer-search/buyer-search.routes';
import favouritePropertyRoutes from './modules/favourite-property/favourite-property.routes';
import sellerAlertRoutes from './modules/seller-alert/seller-alert.routes';
import sellerIntentRoutes from './modules/seller-intent/seller-intent.routes';
import buyerIntentRoutes from './modules/buyer-intent/buyer-intent.routes';

export function mountRoutes(app: Express): void {
  app.use('/auth', authRoutes);
  app.use('/property-estimate', propertyEstimateRoutes);
  app.use('/process-data', cityBlockSalesDataRoutes);
  app.use('/buyer', buyerSearchRoutes);
  app.use('/favourite-property', favouritePropertyRoutes);
  app.use('/seller-alerts', sellerAlertRoutes);
  app.use('/seller-intent', sellerIntentRoutes);
  app.use('/buyer-intent', buyerIntentRoutes);
}
