/**
 * API Service
 * Handles fetching data from the DVF OpenData API with pagination support
 */

import { ApiResponse, FetchDataParams, SalesDataRecord } from './types';
import { processResults } from './data-processor.service';

const BASE_URL = 'https://apidf-preprod.cerema.fr/dvf_opendata/mutations/';

// ============================================================================
// URL Building
// ============================================================================

/**
 * Builds API URL with query parameters
 * 
 * @param anneemut_min - Minimum mutation year
 * @param anneemut_max - Maximum mutation year
 * @param code_insee - INSEE code (municipality identifier)
 * @param page - Page number (default: 1)
 * @returns Complete API URL with query parameters
 */
function buildApiUrl(
  anneemut_min: number,
  anneemut_max: number,
  code_insee: string,
  page: number = 1
): string {
  const params = new URLSearchParams({
    anneemut_min: anneemut_min.toString(),
    anneemut_max: anneemut_max.toString(),
    code_insee: code_insee,
    page: page.toString(),
  });

  return `${BASE_URL}?${params.toString()}`;
}

// ============================================================================
// API Fetching
// ============================================================================

/**
 * Fetches data from a specific API URL
 * 
 * @param url - Complete API URL to fetch from
 * @returns API response data
 * @throws Error if API request fails
 */
async function fetchApiData(url: string): Promise<ApiResponse> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as ApiResponse;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch data from API: ${error.message}`);
    }
    throw error;
  }
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Fetches and processes all data from API with pagination support
 * Automatically handles pagination and processes all results
 * 
 * @param params - Fetch parameters (anneemut_min, anneemut_max, code_insee)
 * @returns Array of all processed sales data records
 */
export async function fetchAndProcessData(
  params: FetchDataParams
): Promise<SalesDataRecord[]> {
  const allRecords: SalesDataRecord[] = [];
  let currentUrl: string | null = buildApiUrl(
    params.anneemut_min,
    params.anneemut_max,
    params.code_insee,
    1
  );

  console.log('[API] Starting data fetch', {
    code_insee: params.code_insee,
    year_range: `${params.anneemut_min}-${params.anneemut_max}`,
  });

  let pageCount = 0;

  // Fetch all pages
  while (currentUrl !== null) {
    pageCount++;
    console.log(`[API] Fetching page ${pageCount}...`);

    try {
      const response: ApiResponse = await fetchApiData(currentUrl);

      // Process results from this page
      const records = processResults(response.results);
      allRecords.push(...records);

      console.log(`[API] Page ${pageCount} processed:`, {
        results_count: response.results.length,
        records_extracted: records.length,
        total_count: response.count,
      });

      // Check for next page
      if (response.next) {
        currentUrl = response.next;
      } else {
        currentUrl = null;
      }
    } catch (error) {
      console.error(`[API] Error fetching page ${pageCount}:`, error);
      throw error;
    }
  }

  console.log('[API] Data fetch completed', {
    total_pages: pageCount,
    total_records: allRecords.length,
  });

  return allRecords;
}
