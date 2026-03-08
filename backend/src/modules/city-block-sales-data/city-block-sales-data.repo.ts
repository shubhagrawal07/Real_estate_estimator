/**
 * City Block Sales Data Repository
 * Handles all database operations for city block sales data
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { CityBlockSalesData } from './city-block-sales-data.model';
import { SalesDataRecord } from './types';
import { logger } from '../../utils/logger';

export class CityBlockSalesDataRepo {
  private repository: Repository<CityBlockSalesData>;

  constructor() {
    this.repository = AppDataSource.getRepository(CityBlockSalesData);
  }

  // ============================================================================
  // Insert Operations
  // ============================================================================

  /**
   * Inserts a single city block sales data record
   * 
   * @param data - Sales data record to insert
   * @returns Created record
   */
  async insert(data: SalesDataRecord): Promise<CityBlockSalesData> {
    const newRecord = this.repository.create({
      idpar: data.idpar,
      sterr: data.sterr,
      sbati: data.sbati,
      price: data.price,
      date: data.date,
      type: data.type,
    });
    return this.repository.save(newRecord);
  }

  /**
   * Inserts multiple records using bulk insert for better performance
   * Batches inserts to avoid PostgreSQL parameter limit (65535 parameters)
   * 
   * @param dataArray - Array of sales data records to insert
   */
  async insertMany(dataArray: SalesDataRecord[]): Promise<void> {
    if (dataArray.length === 0) {
      return;
    }

    // PostgreSQL has a limit of ~65535 parameters per query
    // With 6 fields per record, we can safely insert ~1000 records per batch
    // (1000 * 6 = 6000 parameters, well under the limit)
    const BATCH_SIZE = 1000;

    // Process in batches
    for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
      const batch = dataArray.slice(i, i + BATCH_SIZE);
      
      // Prepare records for bulk insert
      const records = batch.map((data) =>
        this.repository.create({
          idpar: data.idpar,
          sterr: data.sterr,
          sbati: data.sbati,
          price: data.price,
          date: data.date,
          type: data.type,
        })
      );

      // Execute bulk insert for this batch
      await this.repository
        .createQueryBuilder()
        .insert()
        .into(CityBlockSalesData)
        .values(records)
        .execute();

      logger.info('Inserted batch', {
        batch: Math.floor(i / BATCH_SIZE) + 1,
        totalBatches: Math.ceil(dataArray.length / BATCH_SIZE),
        recordCount: batch.length,
      });
    }
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Finds a record by idpar
   * 
   * @param idpar - IdPar value to search for
   * @returns Found record or null
   */
  async findByIdpar(idpar: string): Promise<CityBlockSalesData | null> {
    return this.repository.findOne({
      where: { idpar },
    });
  }

  /**
   * Finds all records for a given code_insee (prefix match on idpar)
   * 
   * @param codeInsee - INSEE code (first 5 characters of idpar)
   * @returns Array of matching records, ordered by idpar
   */
  async findByCodeInsee(codeInsee: string): Promise<CityBlockSalesData[]> {
    return this.repository
      .createQueryBuilder('data')
      .where('data.idpar LIKE :prefix', { prefix: `${codeInsee}%` })
      .orderBy('data.idpar', 'ASC')
      .getMany();
  }

  /**
   * Gets the maximum date for records with a given code_insee
   * Returns date as stored in database (YYYY-MM-DD format) without timezone conversion
   * 
   * @param codeInsee - INSEE code to search for
   * @returns Maximum date as YYYY-MM-DD string, or null if no records exist
   */
  async getMaxDateByCodeInsee(codeInsee: string): Promise<string | null> {
    const result = await this.repository
      .createQueryBuilder('data')
      .select('MAX(data.date)', 'maxDate')
      .where('data.idpar LIKE :prefix', { prefix: `${codeInsee}%` })
      .getRawOne();

    if (!result?.maxDate) {
      return null;
    }

    // Return date as stored in database (YYYY-MM-DD format)
    // PostgreSQL DATE type returns as YYYY-MM-DD string or Date object
    if (typeof result.maxDate === 'string') {
      return result.maxDate;
    } else if (result.maxDate instanceof Date) {
      // Extract YYYY-MM-DD using local date components (no timezone conversion)
      const year = result.maxDate.getFullYear();
      const month = String(result.maxDate.getMonth() + 1).padStart(2, '0');
      const day = String(result.maxDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else {
      // Fallback: convert to string and extract date part
      return result.maxDate.toString().split('T')[0];
    }
  }

  // ============================================================================
  // Aggregation Operations
  // ============================================================================

  /**
   * Finds sales records for valuation: by idpar (exact or prefix), property type, and date range.
   * Used for the segment-based valuation logic (36 months, 2x18 groups, sbati segments).
   *
   * @param idpar - IdPar value (e.g. "83137000BC") or prefix (e.g. "83137000B" for LIKE '83137000B%')
   * @param usePrefix - If true, match idpar LIKE :idpar%; if false, exact idpar
   * @param propertyType - "APPARTEMENT" or "MAISON"
   * @param startDate - Start of date range (inclusive)
   * @param endDate - End of date range (inclusive)
   * @returns Array of records with idpar, sbati, price, date, type
   */
  async findRecordsForValuation(
    idpar: string,
    usePrefix: boolean,
    propertyType: string,
    startDate: Date,
    endDate: Date
  ): Promise<CityBlockSalesData[]> {
    const qb = this.repository
      .createQueryBuilder('data')
      .where('data.date >= :startDate', { startDate })
      .andWhere('data.date <= :endDate', { endDate });

    if (usePrefix) {
      qb.andWhere('data.idpar LIKE :idparPrefix', { idparPrefix: `${idpar}%` });
    } else {
      qb.andWhere('data.idpar = :idpar', { idpar });
    }

    // Property type: APPARTEMENT vs MAISON (exclude APPARTEMENT INDETERMINE as in data-processor)
    if (propertyType === 'APPARTEMENT') {
      qb.andWhere("UPPER(data.type) LIKE '%APPARTEMENT%'");
      qb.andWhere("UPPER(data.type) NOT LIKE '%APPARTEMENT INDETERMINE%'");
    } else if (propertyType === 'MAISON') {
      qb.andWhere("UPPER(data.type) LIKE '%MAISON%'");
    }

    return qb.orderBy('data.date', 'DESC').getMany();
  }

  /**
   * Gets aggregated data for a specific idpar
   * Aggregates all records matching the idpar and returns totals by type
   * Used by property estimate service for price calculations (fallback)
   *
   * @param idpar - IdPar value to aggregate
   * @returns Aggregated data by type (apartment/mansion) or null if no records
   */
  async getAggregatedDataByIdpar(idpar: string): Promise<{
    apartmentCount: number;
    apartmentSbati: number;
    apartmentSterr: number;
    apartmentPrice: number;
    mansionCount: number;
    mansionSbati: number;
    mansionSterr: number;
    mansionPrice: number;
  } | null> {
    const records = await this.repository.find({
      where: { idpar },
    });

    if (records.length === 0) {
      return null;
    }

    // Initialize aggregation counters
    const aggregated = {
      apartmentCount: 0,
      apartmentSbati: 0,
      apartmentSterr: 0,
      apartmentPrice: 0,
      mansionCount: 0,
      mansionSbati: 0,
      mansionSterr: 0,
      mansionPrice: 0,
    };

    // Aggregate by type
    for (const record of records) {
      const type = record.type.toUpperCase();
      
      if (type.includes('APPARTEMENT')) {
        aggregated.apartmentCount += 1;
        aggregated.apartmentSbati += Number(record.sbati);
        aggregated.apartmentSterr += Number(record.sterr);
        aggregated.apartmentPrice += Number(record.price);
      } else if (type.includes('MAISON')) {
        aggregated.mansionCount += 1;
        aggregated.mansionSbati += Number(record.sbati);
        aggregated.mansionSterr += Number(record.sterr);
        aggregated.mansionPrice += Number(record.price);
      }
    }

    return aggregated;
  }
}
