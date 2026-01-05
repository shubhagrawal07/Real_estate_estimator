import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { User } from '../user/user.model';

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

  @Column({ name: 'postal_code', type: 'int' })
  postalCode!: number;

  @Column({ type: 'varchar', length: 255 })
  department!: string;

  @Column({ type: 'varchar', length: 255 })
  municipality!: string;

  @Column({ name: 'cadastral_section', type: 'varchar', length: 255 })
  cadastralSection!: string;

  @Column({ type: 'int', nullable: true })
  impressions?: number;

  @Column({ name: 'estimated_price', type: 'int', nullable: true })
  estimatedPrice?: number;

  @CreateDateColumn({ name: 'created_date' })
  createdDate!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  condition?: string;

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
