import { PropertyEstimateRepo } from '../property-estimate/property-estimate.repo';
import { PropertyType } from '../property-estimate/property-estimate.model';
import { parseLocationCode, combineLocationCode } from '../property-estimate/utils/location-code.util';

export interface BuyerSearchDto {
  propertyType: PropertyType;
  cityInseeCode: string; // 5-digit INSEE code
  cadastralSection: string; // 2-character alphabetic, uppercase
  budget: number;
  bedrooms: number;
}

export interface RankedProperty {
  propertyId: string;
  address: string;
  latitude?: number;
  longitude?: number;
  estimatedPrice?: number;
  type: PropertyType;
  area: number;
  bedrooms: number;
  rankScore: number; // Total score out of 100
  budgetScore: number; // Score out of 70
  bedroomScore: number; // Score out of 30
}

export class BuyerService {
  private propertyRepo: PropertyEstimateRepo;

  constructor() {
    this.propertyRepo = new PropertyEstimateRepo();
  }

  /**
   * Search and rank properties based on buyer criteria
   */
  async searchProperties(searchDto: BuyerSearchDto): Promise<RankedProperty[]> {
    // Build location code from city INSEE code and cadastral section
    const locationCode = combineLocationCode(
      searchDto.cityInseeCode,
      searchDto.cadastralSection.toUpperCase()
    );

    // Get all properties matching the location code and property type
    const allProperties = await this.propertyRepo.findAll();
    
    // Filter properties by location code and property type
    const filteredProperties = allProperties.filter((property) => {
      // Check if location code matches (city + cadastral section)
      const propertyLocation = parseLocationCode(property.locationCode);
      if (!propertyLocation) return false;

      const searchLocation = parseLocationCode(locationCode);
      if (!searchLocation) return false;

      // Match city (INSEE code) and cadastral section
      const cityMatch = propertyLocation.codeInsee === searchLocation.codeInsee;
      const sectionMatch = propertyLocation.cadastralSection === searchLocation.cadastralSection;
      
      // Match property type
      const typeMatch = property.type === searchDto.propertyType;

      return cityMatch && sectionMatch && typeMatch;
    });

    // Rank properties based on budget and bedrooms
    const rankedProperties: RankedProperty[] = filteredProperties.map((property) => {
      const budgetScore = this.calculateBudgetScore(
        searchDto.budget,
        property.estimatedPrice || 0
      );
      const bedroomScore = this.calculateBedroomScore(
        searchDto.bedrooms,
        property.bedrooms
      );
      const totalScore = budgetScore + bedroomScore;

      return {
        propertyId: property.propertyId,
        address: property.address,
        latitude: property.latitude ? Number(property.latitude) : undefined,
        longitude: property.longitude ? Number(property.longitude) : undefined,
        estimatedPrice: property.estimatedPrice || undefined,
        type: property.type,
        area: property.area,
        bedrooms: property.bedrooms,
        rankScore: totalScore,
        budgetScore,
        bedroomScore,
      };
    });

    // Sort by rank score (descending) - highest score first
    rankedProperties.sort((a, b) => b.rankScore - a.rankScore);

    return rankedProperties;
  }

  /**
   * Calculate budget score (out of 70 points)
   * Closest to budget gets highest score
   */
  private calculateBudgetScore(buyerBudget: number, propertyPrice: number): number {
    if (propertyPrice === 0) return 0;

    // Calculate percentage difference
    const difference = Math.abs(propertyPrice - buyerBudget);
    const percentageDiff = difference / buyerBudget;

    // Score decreases as difference increases
    // Perfect match (0% difference) = 70 points
    // 10% difference = ~63 points
    // 20% difference = ~56 points
    // 50% difference = ~35 points
    // 100% difference = 0 points
    const score = Math.max(0, 70 * (1 - percentageDiff));

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate bedroom score (out of 30 points)
   * Score is calculated out of the maximum value (buyer's requested bedrooms)
   */
  private calculateBedroomScore(buyerBedrooms: number, propertyBedrooms: number): number {
    if (buyerBedrooms === 0) return 30; // If buyer doesn't specify, give full points

    // Calculate score based on how close property bedrooms are to buyer's request
    // Perfect match = 30 points
    // Difference of 1 = 23 points (as mentioned in requirements: "23 out of 30 if bedroom selected by buyer is 4 and the no. of bedroom present in a property is 3 or 5")
    // Difference of 2 = 15 points
    // Difference of 3+ = 0 points
    
    const difference = Math.abs(propertyBedrooms - buyerBedrooms);
    
    let score: number;
    if (difference === 0) {
      score = 30; // Perfect match
    } else if (difference === 1) {
      score = 23; // As per requirement example
    } else if (difference === 2) {
      score = 15;
    } else {
      score = Math.max(0, 30 - (difference * 10)); // Decrease by 10 points per bedroom difference
    }

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }
}

