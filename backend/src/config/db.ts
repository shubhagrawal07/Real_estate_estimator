import { DataSource } from 'typeorm';
import { PropertyEstimate } from '../modules/property-estimate/property-estimate.model';
import { ApartmentDetails } from '../modules/property-estimate/entities/apartment-details.model';
import { HouseDetails } from '../modules/property-estimate/entities/house-details.model';
import { User } from '../modules/user/user.model';
import { Zone } from '../modules/zone/zone.model';
import { Subscription } from '../modules/subscription/subscription.model';
import { CityBlockSalesData } from '../modules/city-block-sales-data/city-block-sales-data.model';
import { FavouriteProperty } from '../modules/favourite-property/favourite-property.model';
import { BuyerEngagement } from '../modules/buyer-engagement/buyer-engagement.model';
import { SellerAlert } from '../modules/seller-alert/seller-alert.model';
import { config } from './env';
import { logger } from '../utils/logger';

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
    FavouriteProperty,
    BuyerEngagement,
    SellerAlert,
  ],
  synchronize: config.nodeEnv !== 'production',
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    // In production, check if tables exist first
    if (config.nodeEnv === 'production') {
      // Create a temporary connection to check if database is empty
      const tempDataSource = new DataSource({
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
        synchronize: false, // Don't synchronize yet
      });
      
      await tempDataSource.initialize();
      const queryRunner = tempDataSource.createQueryRunner();
      
      try {
        // Check if any tables exist
        const tables = await queryRunner.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `);
        
        await queryRunner.release();
        await tempDataSource.destroy();
        
        if (tables.length === 0) {
          logger.info('No tables found. Creating database schema');
          const syncDataSource = new DataSource({
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
            synchronize: true, // Enable synchronize to create tables
          });
          
          await syncDataSource.initialize();
          await syncDataSource.destroy();
          logger.info('Database schema created successfully');
        } else {
          logger.info('Existing tables found', { count: tables.length });
        }
      } catch (error) {
        await queryRunner.release();
        await tempDataSource.destroy();
        throw error;
      }
    }
    
    await AppDataSource.initialize();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Error connecting to database', {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
