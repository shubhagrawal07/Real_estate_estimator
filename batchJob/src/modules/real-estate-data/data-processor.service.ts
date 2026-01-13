import {
  MutationResult,
  PropertyData,
  SectionData,
  SectionMap,
} from './types';

/**
 * Extract the alphabetical section from l_idpar
 * Example: "83137000BE0330" -> "BE"
 */
function extractSection(idpar: string): string | null {
  const match = idpar.match(/[A-Z]+/);
  return match ? match[0] : null;
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
  for (const idpar of mutation.l_idpar) {
    const section = extractSection(idpar);
    if (!section) {
      continue;
    }

    // Initialize section if it doesn't exist
    if (!map[section]) {
      map[section] = {
        department: mutation.coddep,
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
      map[section].data[0].sterr += sterr;
      map[section].data[0].sbati += sbati;
      map[section].data[0].valeurfonc += valeurfonc;
      map[section].data[0].count += 1;
    } else if (isMansion(mutation.libtypbien)) {
      map[section].data[1].sterr += sterr;
      map[section].data[1].sbati += sbati;
      map[section].data[1].valeurfonc += valeurfonc;
      map[section].data[1].count += 1;
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