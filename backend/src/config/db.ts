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
        
        // If no tables exist, create a new DataSource with synchronize enabled
        if (tables.length === 0) {
          console.log('No tables found. Creating database schema...');
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
          console.log('Database schema created successfully');
        } else {
          console.log(`Found ${tables.length} existing table(s)`);
        }
      } catch (error) {
        await queryRunner.release();
        await tempDataSource.destroy();
        throw error;
      }
    }
    
    // Initialize the main DataSource
    await AppDataSource.initialize();
    console.log('Database connected successfully');
    
    // Note: Reference data (criteria, amenities, features, parking) is now hardcoded
    // in price-impact-factors.ts constants file, so seeding is no longer needed
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
};
