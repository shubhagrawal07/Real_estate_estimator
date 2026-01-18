import { PropertyEstimateRepo } from './property-estimate.repo';
import { PropertyEstimate, PropertyType, OwnershipType, Deadline, PropertyStatus } from './property-estimate.model';
import { combineLocationCode, parseLocationCode } from './utils/location-code.util';
import { CityBlockSalesDataRepo } from '../city-block-sales-data/city-block-sales-data.repo';

export interface CreatePropertyEstimateDto {
  address: string;
  locationCode: string; // Format: {code_insee}{padding}{cadastral_section} e.g., "83137000BY"
  type: PropertyType;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  hasBalcony: boolean;
  hasParking: boolean;
  ownershipType: OwnershipType;
  deadline: Deadline;
  condition?: string;
}

export class PropertyEstimateService {
  private repo: PropertyEstimateRepo;
  private cityBlockSalesRepo: CityBlockSalesDataRepo;

  constructor() {
    this.repo = new PropertyEstimateRepo();
    this.cityBlockSalesRepo = new CityBlockSalesDataRepo();
  }

  async createEstimate(dto: CreatePropertyEstimateDto, userId?: string): Promise<PropertyEstimate> {
    const estimatedPrice = await this.calculatePrice(dto);

    return this.repo.create({
      ...dto,
      estimatedPrice,
      impressions: 0,
      status: userId ? PropertyStatus.NEW : PropertyStatus.DRAFT,
      userId: userId || undefined,
    });
  }

  private async calculatePrice(dto: CreatePropertyEstimateDto): Promise<number> {
    // Try to get euros/m² from city_block_sales_data first
    let basePricePerSqM = await this.getPricePerSqMFromSalesData(dto.locationCode, dto.type);
    
    // If no sales data found, fall back to default pricing
    if (!basePricePerSqM) {
      basePricePerSqM = 2000; // Base price per square meter

      // Extract department from location code for location-based pricing
      const locationParts = parseLocationCode(dto.locationCode);
      const department = locationParts?.department || '';
      
      // Department-based pricing multiplier
      const locationMultiplier = this.getLocationMultiplier(department);
      basePricePerSqM *= locationMultiplier;
    }

    // Property type multiplier
    const typeMultiplier = dto.type === PropertyType.HOUSE ? 1.2 : 1.0;
    basePricePerSqM *= typeMultiplier;

    // Bedroom multiplier
    const bedroomMultiplier = 1 + (dto.bedrooms - 2) * 0.1;
    
    // Bathroom multiplier
    const bathroomMultiplier = 1 + (dto.bathrooms - 1.5) * 0.15;

    // Floor multiplier (more floors can add value)
    const floorMultiplier = 1 + (dto.floors - 1) * 0.05;

    // Feature multipliers
    const balconyMultiplier = dto.hasBalcony ? 1.1 : 1.0;
    const parkingMultiplier = dto.hasParking ? 1.15 : 1.0;

    // Ownership and deadline multipliers
    const ownershipMultiplier = dto.ownershipType === OwnershipType.OWNER ? 1.0 : 0.95;
    const deadlineMultiplier = dto.deadline === Deadline.IMMEDIATE ? 0.98 : 1.0;

    // Condition multiplier
    const conditionMultiplier = this.getConditionMultiplier(dto.condition);

    const estimatedPrice =
      dto.area *
      basePricePerSqM *
      bedroomMultiplier *
      bathroomMultiplier *
      floorMultiplier *
      balconyMultiplier *
      parkingMultiplier *
      ownershipMultiplier *
      deadlineMultiplier *
      conditionMultiplier;

    return Math.round(estimatedPrice);
  }

  private getLocationMultiplier(department: string): number {
    // Simplified location-based pricing using department code
    // Department codes: 75=Paris, 69=Lyon, 13=Marseille, 31=Toulouse, 06=Nice, 44=Nantes, 67=Strasbourg, 34=Montpellier, 33=Bordeaux, 59=Lille
    const locationMultipliers: { [key: string]: number } = {
      '75': 2.5,  // Paris
      '69': 1.8,  // Lyon
      '13': 1.6,  // Marseille
      '31': 1.4,  // Toulouse
      '06': 1.9,  // Nice
      '44': 1.5,  // Nantes
      '67': 1.3,  // Strasbourg
      '34': 1.4,  // Montpellier
      '33': 1.6,  // Bordeaux
      '59': 1.2,  // Lille
    };

    return locationMultipliers[department] || 1.0;
  }

  /**
   * Get price per square meter from city_block_sales_data
   * Uses locationCode as idpar to query the sales data
   * @param locationCode - Location code (format: {code_insee}{padding}{cadastral_section}, e.g., "83137000BY")
   * @param propertyType - Property type (APARTMENT or HOUSE)
   * @returns Price per square meter in euros, or null if no data found
   */
  private async getPricePerSqMFromSalesData(
    locationCode: string,
    propertyType: PropertyType
  ): Promise<number | null> {
    try {
      // Use locationCode as idpar (they have the same format: code_insee + 000 + section)
      const salesData = await this.cityBlockSalesRepo.findByIdpar(locationCode);

      if (!salesData) {
        return null;
      }

      let pricePerSqM: number | null = null;

      if (propertyType === PropertyType.APARTMENT) {
        // For apartments: calculate euros/m² using apartment_sbati (living area) and apartment_price
        if (salesData.apartmentCount > 0 && salesData.apartmentSbati > 0) {
          pricePerSqM = Number(salesData.apartmentPrice) / Number(salesData.apartmentSbati);
        }
      } else if (propertyType === PropertyType.HOUSE) {
        // For houses (mansions): calculate euros/m² using mansion_sbati (living area) and mansion_price
        if (salesData.mansionCount > 0 && salesData.mansionSbati > 0) {
          pricePerSqM = Number(salesData.mansionPrice) / Number(salesData.mansionSbati);
        }
      }

      return pricePerSqM && pricePerSqM > 0 ? pricePerSqM : null;
    } catch (error) {
      console.error('Error fetching price per sqm from sales data:', error);
      return null;
    }
  }

  private getConditionMultiplier(condition?: string): number {
    if (!condition) return 1.0;
    
    const conditionMultipliers: { [key: string]: number } = {
      'excellent': 1.2,
      'good': 1.0,
      'fair': 0.85,
      'poor': 0.7,
      'needs renovation': 0.6,
    };

    return conditionMultipliers[condition.toLowerCase()] || 1.0;
  }

  async findAll(): Promise<PropertyEstimate[]> {
    return this.repo.findAll();
  }

  async findOne(id: string): Promise<PropertyEstimate | null> {
    return this.repo.findOne(id);
  }

  async recalculateEstimate(propertyId: string): Promise<PropertyEstimate | null> {
    const estimate = await this.repo.findOne(propertyId);
    if (!estimate) {
      return null;
    }

    // Convert estimate to DTO format for price calculation
    const dto: CreatePropertyEstimateDto = {
      address: estimate.address,
      locationCode: estimate.locationCode,
      type: estimate.type,
      area: estimate.area,
      bedrooms: estimate.bedrooms,
      bathrooms: estimate.bathrooms,
      floors: estimate.floors,
      hasBalcony: estimate.hasBalcony,
      hasParking: estimate.hasParking,
      ownershipType: estimate.ownershipType,
      deadline: estimate.deadline,
      condition: estimate.condition,
    };

    const newEstimatedPrice = await this.calculatePrice(dto);
    
    // Update only the estimated price
    return this.repo.updateEstimatedPrice(propertyId, newEstimatedPrice);
  }

  async deleteEstimate(propertyId: string): Promise<boolean> {
    return this.repo.delete(propertyId);
  }
}
