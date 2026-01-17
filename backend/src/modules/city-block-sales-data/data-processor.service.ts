import {
  MutationResult,
  PropertyData,
  SectionData,
  SectionMap,
} from './types';

/**
 * Extract the idpar up to the last alphabetical character from l_idpar
 * Example: "75101000AO0066" -> "75101000AO"
 * The idpar is combination of code_insee (75101) and cadastralSection (AO)
 */
function extractIdpar(idparValue: string): string | null {
  // Match everything up to and including the last alphabetical character
  const match = idparValue.match(/^(.+[A-Z])/);
  return match ? match[1] : null;
}

/**
 * Check if libtypbien is an apartment or mansion
 */
function isApartment(libtypbien: string): boolean {
  return libtypbien.toUpperCase().includes('APPARTEMENT');
}

function isMansion(libtypbien: string): boolean {
  return libtypbien.toUpperCase().includes('MAISON');
}

/**
 * Parse numeric values from strings
 */
function parseNumber(value: string): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Initialize empty section data
 * Array of 2 objects: [apartment, mansion]
 */
function initializeSectionData(): SectionData {
  return [
    { sterr: 0, sbati: 0, valeurfonc: 0, count: 0 }, // apartment (index 0)
    { sterr: 0, sbati: 0, valeurfonc: 0, count: 0 }, // mansion (index 1)
  ];
}

/**
 * Process a single mutation result and update the map
 */
export function processMutation(
  mutation: MutationResult,
  map: SectionMap
): void {
  // Filter: only process if libtypbien contains MAISON or APPARTEMENT
  if (!isApartment(mutation.libtypbien) && !isMansion(mutation.libtypbien)) {
    return;
  }

  // Process each l_idpar value
  for (const idparValue of mutation.l_idpar) {
    const idpar = extractIdpar(idparValue);
    if (!idpar) {
      continue;
    }

    // Initialize idpar if it doesn't exist
    if (!map[idpar]) {
      map[idpar] = {
        data: initializeSectionData(),
      };
    }

    // Parse numeric values
    const sterr = parseNumber(mutation.sterr);
    const sbati = parseNumber(mutation.sbati);
    const valeurfonc = parseNumber(mutation.valeurfonc);

    // Add values to the appropriate type (apartment or mansion)
    // Array index 0 = apartment, index 1 = mansion
    if (isApartment(mutation.libtypbien)) {
      map[idpar].data[0].sterr += sterr;
      map[idpar].data[0].sbati += sbati;
      map[idpar].data[0].valeurfonc += valeurfonc;
      map[idpar].data[0].count += 1;
    } else if (isMansion(mutation.libtypbien)) {
      map[idpar].data[1].sterr += sterr;
      map[idpar].data[1].sbati += sbati;
      map[idpar].data[1].valeurfonc += valeurfonc;
      map[idpar].data[1].count += 1;
    }
  }
}

/**
 * Process all results from the API response
 */
export function processResults(
  results: MutationResult[],
  map: SectionMap
): void {
  for (const result of results) {
    processMutation(result, map);
  }
}
