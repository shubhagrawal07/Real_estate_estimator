/** Mirrors backend parseLocationCode for 10-char codes (INSEE + padding + section). */
export function parseLocationCode(locationCode: string): {
  codeInsee: string;
  cadastralSection: string;
} | null {
  if (!locationCode || locationCode.length < 10) return null;
  const codeInsee = locationCode.substring(0, 5);
  const padding = locationCode.substring(5, 8);
  const cadastralSection = locationCode.substring(8, 10);
  if (!/^\d{5}$/.test(codeInsee) || !/^\d{3}$/.test(padding)) return null;
  return { codeInsee, cadastralSection: cadastralSection.toUpperCase() };
}

export function zoneFieldsFromLocationCode(locationCode: string | undefined): {
  cityInseeCode: string;
  cadastralSection: string;
} {
  const p = locationCode ? parseLocationCode(locationCode) : null;
  return {
    cityInseeCode: p?.codeInsee ?? '',
    cadastralSection: p?.cadastralSection ?? '',
  };
}
