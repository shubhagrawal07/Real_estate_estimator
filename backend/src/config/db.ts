import { DataSource } from 'typeorm';
import { PropertyEstimate } from '../modules/property-estimate/property-estimate.model';
import { ApartmentDetails } from '../modules/property-estimate/entities/apartment-details.model';
import { HouseDetails } from '../modules/property-estimate/entities/house-details.model';
import { User } from '../modules/user/user.model';
import { Zone } from '../modules/zone/zone.model';
import { Subscription } from '../modules/subscription/subscription.model';
import { CityBlockSalesData } from '../modules/city-block-sales-data/city-block-sales-data.model';
import { config } from './env';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  entities: [
    User,
    PropertyEstimate,
    ApartmentDetails,
    HouseDetails,
    Zone,
    Subscription,
    CityBlockSalesData,
  ],
  synchronize: config.nodeEnv !== 'production',
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');
    
    // Note: Reference data (criteria, amenities, features, parking) is now hardcoded
    // in price-impact-factors.ts constants file, so seeding is no longer needed
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
};
