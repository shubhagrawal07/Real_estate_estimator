/**
 * Hardcoded price impact factors for property features
 * These values represent percentage impact on property price
 */

export const CRITERIA_PRICE_IMPACTS: { [code: string]: number } = {
  calm: 1.0,
  bright: 1.0,
  near_amenities: 2.0,
  no_vis_a_vis: 1.0,
  well_connected: 2.0,
};

export const AMENITY_PRICE_IMPACTS: { [code: string]: number } = {
  air_conditioning: 1.0,
  modern_bathroom: 1.0,
  recent_kitchen: 1.0,
  fireplace: 1.0,
  electricity_standard: 1.0,
  double_triple_glazing: 1.0,
};

export const FEATURE_PRICE_IMPACTS: { [code: string]: number } = {
  double_living_room: 1.0,
  open_kitchen: 1.0,
  laundry_cellar: 1.0,
};

export const PARKING_PRICE_IMPACTS: { [code: string]: number } = {
  garage: 2.0,
  private: 1.5,
  shared: 0.5,
  street: 0.0,
};

/**
 * Get price impact for a criteria code
 */
export function getCriteriaPriceImpact(code: string): number {
  return CRITERIA_PRICE_IMPACTS[code] || 0;
}

/**
 * Get price impact for an amenity code
 */
export function getAmenityPriceImpact(code: string): number {
  return AMENITY_PRICE_IMPACTS[code] || 0;
}

/**
 * Get price impact for a feature code
 */
export function getFeaturePriceImpact(code: string): number {
  return FEATURE_PRICE_IMPACTS[code] || 0;
}

/**
 * Get price impact for a parking code
 */
export function getParkingPriceImpact(code: string): number {
  return PARKING_PRICE_IMPACTS[code] || 0;
}

/**
 * Calculate total price impact from an array of codes
 */
export function calculateTotalPriceImpact(
  codes: string[],
  impactMap: { [code: string]: number }
): number {
  return codes.reduce((total, code) => {
    return total + (impactMap[code] || 0);
  }, 0);
}

