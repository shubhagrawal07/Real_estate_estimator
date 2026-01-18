import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import type { User } from '../user/user.model';
import type { PropertyCriteria } from './entities/property-criteria.model';
import type { PropertyAmenity } from './entities/property-amenity.model';
import type { PropertyParking } from './entities/property-parking.model';
import type { PropertyFeature } from './entities/property-feature.model';
import type { ApartmentDetails } from './entities/apartment-details.model';
import type { HouseDetails } from './entities/house-details.model';

export enum PropertyType {
  APARTMENT = 'Apartment',
  HOUSE = 'House',
}

export enum OwnershipType {
  OWNER = 'Owner',
  TENANT = 'tenant',
}

export enum Deadline {
  IMMEDIATE = 'immediate',
  NOT_IMMEDIATE = 'not immediate',
}

export enum BuildingAge {
  RECENT = 'recent',
  OLD = 'old',
}

// OutdoorSpace moved to apartment-details.model.ts
// PoolOption moved to house-details.model.ts

export enum PropertyStatus {
  DRAFT = 'draft',
  NEW = 'new',
  SOLD = 'sold',
}

@Entity('property_estimates')
export class PropertyEstimate {
  @PrimaryGeneratedColumn('uuid')
  propertyId!: string;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 500 })
  address!: string;

  @Column({ name: 'location_code', type: 'varchar', length: 10 })
  locationCode!: string; // Format: {code_insee}{padding}{cadastral_section} e.g., "83137000BY"

  @Column({ type: 'int', nullable: true })
  impressions?: number;

  @Column({ name: 'estimated_price', type: 'int', nullable: true })
  estimatedPrice?: number;

  @CreateDateColumn({ name: 'created_date' })
  createdDate!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  condition?: string;

  @Column({
    name: 'building_age',
    type: 'enum',
    enum: BuildingAge,
    default: BuildingAge.RECENT,
  })
  buildingAge!: BuildingAge;

  @Column({
    type: 'enum',
    enum: PropertyType,
  })
  type!: PropertyType;

  @Column({ type: 'int' })
  area!: number;

  @Column({ type: 'int', default: 1 })
  bedrooms!: number;

  @Column({ type: 'int', default: 1 })
  bathrooms!: number;

  @Column({ type: 'int', default: 1 })
  floors!: number;

  @Column({ name: 'has_balcony', type: 'boolean', default: false })
  hasBalcony!: boolean;

  @Column({ name: 'has_parking', type: 'boolean', default: false })
  hasParking!: boolean;

  // Type-specific details (3NF normalization)
  @OneToOne('ApartmentDetails', 'property', { nullable: true })
  apartmentDetails?: ApartmentDetails;

  @OneToOne('HouseDetails', 'property', { nullable: true })
  houseDetails?: HouseDetails;

  // Feature relationships (3NF)
  @OneToMany('PropertyCriteria', 'property')
  propertyCriteria!: PropertyCriteria[];

  @OneToMany('PropertyAmenity', 'property')
  propertyAmenities!: PropertyAmenity[];

  @OneToMany('PropertyParking', 'property')
  propertyParking!: PropertyParking[];

  @OneToMany('PropertyFeature', 'property')
  propertyFeatures!: PropertyFeature[];

  @Column({
    name: 'ownership_type',
    type: 'enum',
    enum: OwnershipType,
    default: OwnershipType.OWNER,
  })
  ownershipType!: OwnershipType;

  @Column({
    type: 'enum',
    enum: Deadline,
    default: Deadline.NOT_IMMEDIATE,
  })
  deadline!: Deadline;

  @Column({
    type: 'enum',
    enum: PropertyStatus,
  })
  status!: PropertyStatus;
}
