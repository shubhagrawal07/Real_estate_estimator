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

export interface PropertyData {
  sterr: number;
  sbati: number;
  valeurfonc: number;
  count: number;
}

// SectionData is an array of 2 objects: [apartment, mansion]
export type SectionData = [PropertyData, PropertyData];

// SectionMap with department information
export interface SectionMapEntry {
  department: string;
  data: SectionData;
}

export type SectionMap = Record<string, SectionMapEntry>;

export interface FetchDataParams {
  anneemut_min: number;
  anneemut_max: number;
  code_insee: string;
}
