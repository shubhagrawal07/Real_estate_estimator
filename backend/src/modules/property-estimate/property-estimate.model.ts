import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import type { User } from '../user/user.model';
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

export enum Feedback {
  ACCURATE = 'accurate',
  HIGH = 'high',
  LOW = 'low',
  INACCURATE = 'inaccurate',
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

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'int', nullable: true })
  impressions?: number;

  @Column({ name: 'estimated_price', type: 'int', nullable: true })
  estimatedPrice?: number;

  @Column({ name: 'base_price_per_sqm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  basePricePerSqM?: number; // Base price per square meter (after 0.90 multiplier, before other multipliers)

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

  // Store criteria, amenities, features, and parking as JSON arrays of codes
  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  criteria!: string[]; // Array of criteria codes (e.g., ['calm', 'bright', 'well_connected'])

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  amenities!: string[]; // Array of amenity codes (e.g., ['air_conditioning', 'modern_bathroom'])

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  features!: string[]; // Array of feature codes (e.g., ['double_living_room', 'open_kitchen'])

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  parking!: string[]; // Array of parking codes (e.g., ['garage', 'private'])

  // Type-specific details (3NF normalization)
  @OneToOne('ApartmentDetails', 'property', { nullable: true })
  apartmentDetails?: ApartmentDetails;

  @OneToOne('HouseDetails', 'property', { nullable: true })
  houseDetails?: HouseDetails;

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

  @Column({ name: 'trigger_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  triggerPrice?: number;

  @Column({ name: 'engagement_level', type: 'int', default: 1 })
  engagementLevel!: number;

  @Column({ name: 'buyer_tracking', type: 'boolean', default: false })
  buyerTracking!: boolean;

  @Column({
    name: 'feedback',
    type: 'enum',
    enum: Feedback,
    nullable: true,
  })
  feedback?: Feedback;
}
