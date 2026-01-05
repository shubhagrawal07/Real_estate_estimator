import { PropertyEstimateRepo } from './property-estimate.repo';
import { PropertyEstimate } from './property-estimate.model';

export interface CreatePropertyEstimateDto {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt?: number;
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
    });
  }

  private calculatePrice(dto: CreatePropertyEstimateDto): number {
    let basePricePerSqFt = 150;

    const cityMultiplier = this.getCityMultiplier(dto.city);
    basePricePerSqFt *= cityMultiplier;

    const bedroomMultiplier = 1 + (dto.bedrooms - 2) * 0.1;
    const bathroomMultiplier = 1 + (dto.bathrooms - 1.5) * 0.15;

    const currentYear = new Date().getFullYear();
    const age = dto.yearBuilt ? currentYear - dto.yearBuilt : 20;
    const ageMultiplier = Math.max(0.7, 1 - (age / 100));

    const estimatedPrice =
      dto.squareFeet *
      basePricePerSqFt *
      bedroomMultiplier *
      bathroomMultiplier *
      ageMultiplier;

    return Math.round(estimatedPrice);
  }

  private getCityMultiplier(city: string): number {
    const cityMultipliers: { [key: string]: number } = {
      'New York': 2.5,
      'San Francisco': 2.8,
      'Los Angeles': 2.2,
      'Chicago': 1.3,
      'Houston': 1.0,
      'Phoenix': 1.2,
      'Philadelphia': 1.4,
      'San Antonio': 1.1,
      'San Diego': 2.0,
      'Dallas': 1.2,
    };

    return cityMultipliers[city] || 1.0;
  }

  async findAll(): Promise<PropertyEstimate[]> {
    return this.repo.findAll();
  }

  async findOne(id: number): Promise<PropertyEstimate | null> {
    return this.repo.findOne(id);
  }
}
