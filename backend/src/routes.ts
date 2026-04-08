import { Express } from 'express';
import propertyEstimateRoutes from './modules/property-estimate/property-estimate.routes';
import authRoutes from './modules/auth/auth.routes';
import cityBlockSalesDataRoutes from './modules/city-block-sales-data/city-block-sales-data.routes';
import buyerRoutes from './modules/buyer/buyer.routes';
import favouritePropertyRoutes from './modules/favourite-property/favourite-property.routes';
import buyerEngagementRoutes from './modules/buyer-engagement/buyer-engagement.routes';
import sellerAlertRoutes from './modules/seller-alert/seller-alert.routes';
import userIntentRoutes from './modules/user-intent/user-intent.routes';

export function mountRoutes(app: Express): void {
  app.use('/auth', authRoutes);
  app.use('/property-estimate', propertyEstimateRoutes);
  app.use('/process-data', cityBlockSalesDataRoutes);
  app.use('/buyer', buyerRoutes);
  app.use('/favourite-property', favouritePropertyRoutes);
  app.use('/buyer-engagement', buyerEngagementRoutes);
  app.use('/seller-alerts', sellerAlertRoutes);
  app.use('/user-intent', userIntentRoutes);
}
