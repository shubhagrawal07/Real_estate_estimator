import { PropertyEstimateRepo } from './property-estimate.repo';
import { PropertyEstimate, PropertyType, OwnershipType, Deadline, PropertyStatus } from './property-estimate.model';

export interface CreatePropertyEstimateDto {
  address: string;
  postalCode: number;
  department: string;
  municipality: string;
  cadastralSection: string;
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

  constructor() {
    this.repo = new PropertyEstimateRepo();
  }

  async createEstimate(dto: CreatePropertyEstimateDto): Promise<PropertyEstimate> {
    const estimatedPrice = this.calculatePrice(dto);

    return this.repo.create({
      ...dto,
      estimatedPrice,
      impressions: 0,
      status: PropertyStatus.NEW,
    });
  }

  private calculatePrice(dto: CreatePropertyEstimateDto): number {
    let basePricePerSqM = 2000; // Base price per square meter

    // Department/municipality multiplier (location-based pricing)
    const locationMultiplier = this.getLocationMultiplier(dto.department, dto.municipality);
    basePricePerSqM *= locationMultiplier;

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

  private getLocationMultiplier(department: string, municipality: string): number {
    // Simplified location-based pricing
    // In a real application, this would use more sophisticated location data
    const locationMultipliers: { [key: string]: number } = {
      'Paris': 2.5,
      'Lyon': 1.8,
      'Marseille': 1.6,
      'Toulouse': 1.4,
      'Nice': 1.9,
      'Nantes': 1.5,
      'Strasbourg': 1.3,
      'Montpellier': 1.4,
      'Bordeaux': 1.6,
      'Lille': 1.2,
    };

    return locationMultipliers[municipality] || locationMultipliers[department] || 1.0;
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

  async findOne(id: number): Promise<PropertyEstimate | null> {
    return this.repo.findOne(id);
  }
}
