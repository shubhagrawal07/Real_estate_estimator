/**
 * City Block Sales Data Service
 * Main service for processing and saving real estate data
 */

import { FetchDataParams, SalesDataRecord } from './types';
import { fetchAndProcessData } from './api.service';
import { CityBlockSalesDataRepo } from './city-block-sales-data.repo';
import { logger } from '../../utils/logger';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extracts date in YYYY-MM-DD format from a Date object or string
 * Uses the same format as stored in database (no timezone conversion)
 * 
 * @param date - Date object or string
 * @returns Date string in YYYY-MM-DD format
 */
function extractDateString(date: Date | string): string {
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  
  // Extract YYYY-MM-DD using local date components (same as stored in DB)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Saves processed data to the database
 * Only saves records with date > max date for this code_insee
 * If no data exists for this code_insee, saves all records
 *
 * @param records - Array of sales data records to save
 * @param codeInsee - INSEE code for filtering
 * @returns Number of records actually saved to the database
 */
async function saveToDatabase(
  records: SalesDataRecord[],
  codeInsee: string
): Promise<number> {
  const repo = new CityBlockSalesDataRepo();

  const serviceLog = logger.child({ module: 'city-block-service' });
  if (records.length === 0) {
    serviceLog.info('No records to save');
    return 0;
  }

  const maxDate = await repo.getMaxDateByCodeInsee(codeInsee);
  let recordsToSave: SalesDataRecord[];

  if (maxDate === null) {
    serviceLog.info('No existing data for code_insee; saving all records', {
      code_insee: codeInsee,
      count: records.length,
    });
    recordsToSave = records;
  } else {
    recordsToSave = records.filter((record) => {
      const recordDateStr = extractDateString(record.date);
      return recordDateStr > maxDate;
    });
    serviceLog.info('Date filtering applied', {
      code_insee: codeInsee,
      max_date: maxDate,
      total_records: records.length,
      filtered_records: recordsToSave.length,
    });
  }

  if (recordsToSave.length > 0) {
    serviceLog.info('Saving records', { count: recordsToSave.length });
    await repo.insertMany(recordsToSave);
    serviceLog.info('Records saved successfully');
    return recordsToSave.length;
  }
  serviceLog.info('No new records to save (all dates <= max date)');
  return 0;
}

// ============================================================================
// Main Service Function
// ============================================================================

export interface ProcessRealEstateDataResult {
  totalRecords: number;
  savedRecords: number;
}

/**
 * Main service function that fetches and processes real estate data
 *
 * Process:
 * 1. Fetches data from API with pagination
 * 2. Processes and filters records (apartments/maisons only)
 * 3. Saves to database (only records with date > max date for code_insee)
 *
 * @param params - Fetch parameters (anneemut_min, anneemut_max, code_insee)
 * @returns { totalRecords, savedRecords }
 */
export async function processRealEstateData(
  params: FetchDataParams
): Promise<ProcessRealEstateDataResult> {
  const { anneemut_min, anneemut_max, code_insee } = params;

  const serviceLog = logger.child({ module: 'city-block-service' });
  serviceLog.info('Starting real estate data processing', {
    code_insee,
    year_range: `${anneemut_min}-${anneemut_max}`,
  });

  try {
    const records = await fetchAndProcessData({
      anneemut_min,
      anneemut_max,
      code_insee,
    });
    const totalRecords = records.length;
    serviceLog.info('Data processing completed', { total_records: totalRecords });

    const savedRecords = await saveToDatabase(records, code_insee);
    serviceLog.info('Processing completed successfully', {
      totalRecords,
      savedRecords,
    });
    return { totalRecords, savedRecords };
  } catch (error) {
    serviceLog.error('Error processing real estate data', {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
