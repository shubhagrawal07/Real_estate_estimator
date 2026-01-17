import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { PropertyEstimate } from './property-estimate.model';

export class PropertyEstimateRepo {
  private repository: Repository<PropertyEstimate>;

  constructor() {
    this.repository = AppDataSource.getRepository(PropertyEstimate);
  }

  async create(data: Partial<PropertyEstimate>): Promise<PropertyEstimate> {
    const estimate = this.repository.create(data);
    return this.repository.save(estimate);
  }

  async findAll(): Promise<PropertyEstimate[]> {
    return this.repository.find({
      order: { createdDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PropertyEstimate | null> {
    return this.repository.findOne({ where: { propertyId: id } });
  }

  async findOneWithRelations(id: string): Promise<PropertyEstimate | null> {
    return this.repository.findOne({
      where: { propertyId: id },
      relations: [
        'apartmentDetails',
        'houseDetails',
        'propertyCriteria',
        'propertyCriteria.criteria',
        'propertyAmenities',
        'propertyAmenities.amenity',
        'propertyParking',
        'propertyParking.parkingType',
        'propertyFeatures',
        'propertyFeatures.feature',
      ],
    });
  }
}
