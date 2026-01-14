import { ApiResponse, FetchDataParams, SectionMap } from './types';
import { processResults } from './data-processor.service';

const BASE_URL = 'https://apidf-preprod.cerema.fr/dvf_opendata/mutations/';

/**
 * Build API URL with query parameters
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

/**
 * Fetch data from a specific URL
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

/**
 * Fetch and process all data with pagination support
 */
export async function fetchAndProcessData(
  params: FetchDataParams
): Promise<SectionMap> {
  const map: SectionMap = {};
  let currentUrl: string | null = buildApiUrl(
    params.anneemut_min,
    params.anneemut_max,
    params.code_insee,
    1
  );

  console.log(`Starting data fetch for code_insee: ${params.code_insee}`);
  console.log(`Year range: ${params.anneemut_min} - ${params.anneemut_max}`);

  let pageCount = 0;

  while (currentUrl !== null) {
    pageCount++;
    console.log(`Fetching page ${pageCount}...`);

    const response: ApiResponse = await fetchApiData(currentUrl);

    // Process results
    processResults(response.results, map);

    console.log(
      `Processed ${response.results.length} results. Total count: ${response.count}`
    );

    // Check if there's a next page
    if (response.next) {
      currentUrl = response.next;
    } else {
      currentUrl = null;
    }
  }

  console.log(`Completed processing. Total pages: ${pageCount}`);
  console.log(`Total sections processed: ${Object.keys(map).length}`);

  return map;
}
