/**
 * Type definitions for city block sales data module
 */

// API Response Types
export interface MutationResult {
  idmutation: number;
  idmutinvar: string;
  idopendata: string;
  datemut: string;
  anneemut: number;
  coddep: string;
  libnatmut: string;
  vefa: boolean;
  valeurfonc: string;
  nbcomm: number;
  l_codinsee: string[];
  nbpar: number;
  l_idpar: string[];
  nbparmut: number;
  l_idparmut: string[];
  sterr: string;
  nbvolmut: number;
  nblocmut: number;
  l_idlocmut: string[];
  sbati: string;
  codtypbien: string;
  libtypbien: string;
}

export interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MutationResult[];
}

// Internal Data Types
export interface SalesDataRecord {
  idpar: string; // Format: {code_insee}{padding}{cadastral_section} e.g., "83137000BY"
  sterr: number; // Land area (m²)
  sbati: number; // Built area (m²)
  price: number; // Property value (€)
  date: Date; // Mutation date
  type: string; // Property type (e.g., "APPARTEMENT", "MAISON")
}

export interface FetchDataParams {
  anneemut_min: number;
  anneemut_max: number;
  code_insee: string;
}
