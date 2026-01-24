/**
 * API Service
 * Handles fetching data from the DVF OpenData API with pagination support
 */

import { config } from '../../config/env';
import { ApiResponse, FetchDataParams, SalesDataRecord } from './types';
import { processResults } from './data-processor.service';

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
  const base = config.dvf.baseUrl.replace(/\/?$/, '');
  return `${base}?${params.toString()}`;
}

// ============================================================================
// API Fetching
// ============================================================================

/**
 * Fetches data from a specific API URL with timeout and improved error handling.
 *
 * @param url - Complete API URL to fetch from
 * @returns API response data
 * @throws Error if API request fails, times out, or response is invalid
 */
async function fetchApiData(url: string): Promise<ApiResponse> {
  const timeoutMs = config.dvf.timeoutMs;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RealEstateEstimator/1.0 (https://github.com)',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      const snippet = text.length > 300 ? `${text.slice(0, 300)}...` : text;
      throw new Error(
        `DVF API error ${response.status} ${response.statusText}. Body: ${snippet}`
      );
    }

    let data: ApiResponse;
    try {
      data = (await response.json()) as ApiResponse;
    } catch (e) {
      throw new Error(
        `DVF API returned invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`
      );
    }
    if (!data || typeof data !== 'object') {
      throw new Error('DVF API response is not an object');
    }
    if (!Array.isArray(data.results)) {
      throw new Error(
        `DVF API response missing or invalid "results" array (got ${typeof data.results})`
      );
    }
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(
          `Request to DVF API timed out after ${timeoutMs / 1000}s. The DVF service may be slow or unreachable. Check DVF_API_BASE_URL and DVF_API_TIMEOUT_MS.`
        );
      }
      throw new Error(`Failed to fetch from DVF API: ${error.message}`);
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
