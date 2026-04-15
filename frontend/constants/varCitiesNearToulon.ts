/**
 * Communes in Var near Toulon — official INSEE municipality codes (5 digits).
 */
export type CityInseeOption = {
  label: string;
  codeInsee: string;
};

export const DEFAULT_CITY_CODE_INSEE = '83137';

export const VAR_CITIES_NEAR_TOULON: readonly CityInseeOption[] = [
  { label: 'Toulon', codeInsee: '83137' },
  { label: 'La Seyne-sur-Mer', codeInsee: '83126' },
  { label: 'Hyères', codeInsee: '83069' },
  { label: 'La Garde', codeInsee: '83062' },
  { label: 'La Valette-du-Var', codeInsee: '83144' },
  { label: 'Six-Fours-les-Plages', codeInsee: '83129' },
  { label: 'Sanary-sur-Mer', codeInsee: '83123' },
  { label: 'Ollioules', codeInsee: '83090' },
  { label: 'Le Pradet', codeInsee: '83098' },
  { label: 'Carqueiranne', codeInsee: '83042' },
] as const;

const byCode = new Map<string, string>(
  VAR_CITIES_NEAR_TOULON.map((c) => [c.codeInsee, c.label])
);

export function getCityLabelForInsee(codeInsee: string): string | undefined {
  return byCode.get(codeInsee);
}
