import type { RankedProperty } from '@/types/estimate';
import { zoneFieldsFromLocationCode } from '@/lib/location-code';

export function normalizeRanked(raw: unknown): RankedProperty {
  const r = raw as Partial<RankedProperty> & Pick<RankedProperty, 'propertyId'>;
  let loc = typeof r.locationCode === 'string' ? r.locationCode : '';
  if (!loc || loc.length < 10) {
    const c = (r.cityInseeCode || '').padStart(5, '0').slice(0, 5);
    const s = (r.cadastralSection || '00').toUpperCase().padEnd(2, '0').slice(0, 2);
    if (/^\d{5}$/.test(c)) {
      loc = `${c}000${s}`;
    }
  }
  const z = zoneFieldsFromLocationCode(loc);
  return {
    ...(r as RankedProperty),
    cityInseeCode: r.cityInseeCode ?? z.cityInseeCode,
    cadastralSection: r.cadastralSection ?? z.cadastralSection,
    locationCode: loc,
  };
}

export function hasConcreteCadastralSection(section: string | undefined): boolean {
  return Boolean(section && section !== '00');
}

export function zoneKey(property: RankedProperty): { city: string; section: string } {
  const z = zoneFieldsFromLocationCode(property.locationCode);
  const city = property.cityInseeCode || z.cityInseeCode;
  const section = property.cadastralSection || z.cadastralSection;
  return { city, section };
}

export function sameZone(a: RankedProperty, anchor: RankedProperty): boolean {
  const A = zoneKey(a);
  const B = zoneKey(anchor);
  if (!B.city) return true;
  if (hasConcreteCadastralSection(B.section)) {
    return A.city === B.city && A.section === B.section;
  }
  return A.city === B.city;
}
