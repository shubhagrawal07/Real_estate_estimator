import type { PropertyEstimate } from './property-estimate.model';

/**
 * Strip circular refs (e.g. houseDetails.property) so JSON serialization does not throw.
 */
export function serializeEstimate(estimate: PropertyEstimate): Record<string, unknown> {
  const out = { ...estimate } as Record<string, unknown>;
  if (out.apartmentDetails && typeof out.apartmentDetails === 'object') {
    const apt = { ...(out.apartmentDetails as object) } as Record<string, unknown>;
    delete apt.property;
    out.apartmentDetails = apt;
  }
  if (out.houseDetails && typeof out.houseDetails === 'object') {
    const house = { ...(out.houseDetails as object) } as Record<string, unknown>;
    delete house.property;
    out.houseDetails = house;
  }
  return out;
}

export function serializeEstimates(estimates: PropertyEstimate[]): Record<string, unknown>[] {
  return estimates.map(serializeEstimate);
}
