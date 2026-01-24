/**
 * Data Processor Service
 * Processes API mutation results and converts them to database records
 */

import { MutationResult, SalesDataRecord } from './types';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Constructs IdPar from API idpar value using location code format
 * Format: {code_insee}{padding}{cadastral_section} = 10 characters
 * Example: "75101000AO0066" -> "75101000AO"
 * 
 * @param idparValue - Raw idpar value from API (e.g., "75101000AO0066")
 * @returns Formatted idpar (e.g., "75101000AO") or null if invalid
 */
function constructIdpar(idparValue: string): string | null {
  // Extract everything up to and including the last alphabetical character
  const match = idparValue.match(/^(.+[A-Z])/);
  if (!match) {
    return null;
  }

  const extracted = match[1];
  
  // Extract code_insee (first 5 digits)
  const codeInseeMatch = extracted.match(/^(\d{5})/);
  if (!codeInseeMatch) {
    return null;
  }

  const codeInsee = codeInseeMatch[1];
  
  // Extract cadastral section (last 2 alphabetical characters)
  const cadastralMatch = extracted.match(/([A-Z]{2})$/);
  if (!cadastralMatch) {
    return null;
  }

  const cadastralSection = cadastralMatch[1].toUpperCase();
  
  // Construct: code_insee (5 digits) + "000" + cadastral_section (2 chars)
  return `${codeInsee}000${cadastralSection}`;
}

/**
 * Parses numeric value from string
 * @param value - String value to parse
 * @returns Parsed number or 0 if invalid
 */
function parseNumber(value: string): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses date from string
 * @param dateString - Date string to parse
 * @returns Parsed Date object or current date if invalid
 */
function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Checks if property type is apartment or maison
 * Excludes "APPARTEMENT INDETERMINE" (indeterminate apartment)
 * 
 * @param libtypbien - Property type string from API
 * @returns true if apartment or maison (excluding indeterminate)
 */
function isApartmentOrMaison(libtypbien: string): boolean {
  const upperType = libtypbien.toUpperCase();
  
  // Exclude indeterminate apartments
  if (upperType.includes('APPARTEMENT INDETERMINE')) {
    return false;
  }
  
  // Include other apartments and maisons
  return upperType.includes('APPARTEMENT') || upperType.includes('MAISON');
}

// ============================================================================
// Processing Functions
// ============================================================================

/**
 * Processes a single mutation result and converts to database records
 * Filters out non-apartment/maison types and invalid idpar values
 * 
 * @param mutation - Single mutation result from API
 * @returns Array of sales data records (one per idpar)
 */
function processMutation(mutation: MutationResult): SalesDataRecord[] {
  const records: SalesDataRecord[] = [];

  // Filter: only process apartments and maisons
  if (!isApartmentOrMaison(mutation.libtypbien)) {
    return records;
  }

  // Parse mutation data
  const sterr = parseNumber(mutation.sterr);
  const sbati = parseNumber(mutation.sbati);
  const price = parseNumber(mutation.valeurfonc);
  const date = parseDate(mutation.datemut);
  const type = mutation.libtypbien;

  // Process each idpar value - create one record per idpar
  for (const idparValue of mutation.l_idpar) {
    const idpar = constructIdpar(idparValue);
    if (!idpar) {
      continue; // Skip invalid idpar values
    }

    records.push({
      idpar,
      sterr,
      sbati,
      price,
      date,
      type,
    });
  }

  return records;
}

/**
 * Processes all mutation results from API response
 * 
 * @param results - Array of mutation results from API
 * @returns Array of all sales data records to be stored
 */
export function processResults(results: MutationResult[]): SalesDataRecord[] {
  const allRecords: SalesDataRecord[] = [];

  for (const result of results) {
    const records = processMutation(result);
    allRecords.push(...records);
  }

  return allRecords;
}
