/**
 * Utility functions for location code format:
 * Format: {code_insee}{padding}{cadastral_section}
 * Example: 83137000BY (code_insee: 83137, padding: 000, cadastral_section: BY)
 * 
 * Total length: 10 characters
 * - First 5 digits: code_insee (INSEE code)
 * - Next 3 digits: padding (000)
 * - Last 2 characters: cadastral section
 * 
 * The first 2 digits of code_insee represent the department.
 */

export interface LocationCodeParts {
  codeInsee: string; // 5 digits (INSEE code)
  department: string; // First 2 digits of code_insee
  cadastralSection: string; // 2 characters
}

/**
 * Combines code_insee and cadastral section into a single location code
 * @param codeInsee - INSEE code (5 digits, e.g., "83137")
 * @param cadastralSection - Cadastral section (2 characters, e.g., "BY")
 * @returns Combined location code (e.g., "83137000BY")
 */
export function combineLocationCode(codeInsee: string, cadastralSection: string): string {
  // Pad code_insee to 5 digits if needed
  const paddedCodeInsee = codeInsee.padStart(5, '0');
  
  // Padding: 3 zeros
  const padding = '000';
  
  // Ensure cadastral section is uppercase and exactly 2 characters
  const normalizedCadastral = cadastralSection.toUpperCase().padEnd(2, '0').substring(0, 2);
  
  return `${paddedCodeInsee}${padding}${normalizedCadastral}`;
}

/**
 * Parses a location code into its components
 * @param locationCode - Combined location code (e.g., "83137000BY")
 * @returns Parsed components or null if invalid
 */
export function parseLocationCode(locationCode: string): LocationCodeParts | null {
  if (!locationCode || locationCode.length < 10) {
    return null;
  }

  // Extract code_insee (first 5 characters), padding (next 3), and cadastral section (last 2 characters)
  const codeInsee = locationCode.substring(0, 5);
  const padding = locationCode.substring(5, 8);
  const cadastralSection = locationCode.substring(8, 10);

  // Validate code_insee is numeric
  if (!/^\d{5}$/.test(codeInsee)) {
    return null;
  }

  // Validate padding (should be numeric, typically "000")
  if (!/^\d{3}$/.test(padding)) {
    return null;
  }

  // Extract department (first 2 digits of code_insee)
  const department = codeInsee.substring(0, 2);

  return {
    codeInsee,
    department,
    cadastralSection: cadastralSection.toUpperCase(),
  };
}

/**
 * Extracts department from location code
 */
export function getDepartmentFromLocationCode(locationCode: string): string | null {
  const parts = parseLocationCode(locationCode);
  return parts?.department || null;
}

/**
 * Extracts code_insee from location code
 */
export function getCodeInseeFromLocationCode(locationCode: string): string | null {
  const parts = parseLocationCode(locationCode);
  return parts?.codeInsee || null;
}

/**
 * Extracts cadastral section from location code
 */
export function getCadastralSectionFromLocationCode(locationCode: string): string | null {
  const parts = parseLocationCode(locationCode);
  return parts?.cadastralSection || null;
}

