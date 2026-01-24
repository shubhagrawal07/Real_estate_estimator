/**
 * City Block Sales Data Service
 * Main service for processing and saving real estate data
 */

import { FetchDataParams, SalesDataRecord } from './types';
import { fetchAndProcessData } from './api.service';
import { CityBlockSalesDataRepo } from './city-block-sales-data.repo';

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

  if (records.length === 0) {
    console.log('[DB] No records to save');
    return 0;
  }

  // Get maximum date for this code_insee
  const maxDate = await repo.getMaxDateByCodeInsee(codeInsee);
  let recordsToSave: SalesDataRecord[];

  if (maxDate === null) {
    // No existing data - save all records
    console.log(`[DB] No existing data for code_insee ${codeInsee}. Saving all ${records.length} records.`);
    recordsToSave = records;
  } else {
    // Filter: only save records with date > maxDate
    recordsToSave = records.filter((record) => {
      const recordDateStr = extractDateString(record.date);
      return recordDateStr > maxDate;
    });
    
    console.log(`[DB] Date filtering for code_insee ${codeInsee}:`, {
      max_date: maxDate,
      total_records: records.length,
      filtered_records: recordsToSave.length,
      skipped: records.length - recordsToSave.length,
    });
  }

  // Save filtered records
  if (recordsToSave.length > 0) {
    console.log(`[DB] Saving ${recordsToSave.length} records...`);
    await repo.insertMany(recordsToSave);
    console.log('[DB] ✅ Records saved successfully');
    return recordsToSave.length;
  } else {
    console.log('[DB] No new records to save (all dates <= max date)');
    return 0;
  }
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

  console.log('[Service] Starting real estate data processing', {
    code_insee,
    year_range: `${anneemut_min}-${anneemut_max}`,
  });

  try {
    // Step 1: Fetch and process data from API
    const records = await fetchAndProcessData({
      anneemut_min,
      anneemut_max,
      code_insee,
    });

    const totalRecords = records.length;
    console.log('[Service] Data processing completed', {
      total_records: totalRecords,
    });

    // Step 2: Save to database with date validation
    const savedRecords = await saveToDatabase(records, code_insee);

    console.log('[Service] ✅ Processing completed successfully', {
      totalRecords,
      savedRecords,
    });
    return { totalRecords, savedRecords };
  } catch (error) {
    console.error('[Service] ❌ Error processing real estate data:', error);
    throw error;
  }
}
