import { Entity, Column, PrimaryColumn, OneToOne, JoinColumn } from 'typeorm';
import { PropertyEstimate } from '../property-estimate.model';

export enum OutdoorSpace {
  NONE = 'none',
  LT10 = 'lt10',
  GTE10 = 'gte10',
}

@Entity('apartment_details')
export class ApartmentDetails {
  @PrimaryColumn({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @OneToOne(() => PropertyEstimate, property => property.apartmentDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: PropertyEstimate;

  @Column({ name: 'has_elevator', type: 'boolean', default: false })
  hasElevator!: boolean;

  @Column({ name: 'floor_number', type: 'int', default: 0 })
  floorNumber!: number;

  @Column({
    name: 'outdoor_space',
    type: 'enum',
    enum: OutdoorSpace,
    default: OutdoorSpace.NONE,
  })
  outdoorSpace!: OutdoorSpace;
}

