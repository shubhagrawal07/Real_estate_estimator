import { DataSource } from 'typeorm';
import { PropertyEstimate } from '../modules/property-estimate/property-estimate.model';
import { ApartmentDetails } from '../modules/property-estimate/entities/apartment-details.model';
import { HouseDetails } from '../modules/property-estimate/entities/house-details.model';
import { Criteria } from '../modules/property-estimate/entities/criteria.model';
import { Amenity } from '../modules/property-estimate/entities/amenity.model';
import { ParkingType } from '../modules/property-estimate/entities/parking-type.model';
import { Feature } from '../modules/property-estimate/entities/feature.model';
import { PropertyCriteria } from '../modules/property-estimate/entities/property-criteria.model';
import { PropertyAmenity } from '../modules/property-estimate/entities/property-amenity.model';
import { PropertyParking } from '../modules/property-estimate/entities/property-parking.model';
import { PropertyFeature } from '../modules/property-estimate/entities/property-feature.model';
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
    Criteria,
    Amenity,
    ParkingType,
    Feature,
    PropertyCriteria,
    PropertyAmenity,
    PropertyParking,
    PropertyFeature,
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
    
    // Seed reference data in development
    if (config.nodeEnv !== 'production') {
      const { seedReferenceData } = await import('../modules/property-estimate/seeds/seed-reference-data');
      await seedReferenceData();
    }
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
};
