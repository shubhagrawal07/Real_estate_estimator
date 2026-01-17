import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { PropertyEstimate } from '../property-estimate.model';
import { ParkingType } from './parking-type.model';

@Entity('property_parking')
export class PropertyParking {
  @PrimaryColumn({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @PrimaryColumn({ name: 'parking_type_id', type: 'int' })
  parkingTypeId!: number;

  @ManyToOne(() => PropertyEstimate, property => property.propertyParking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: PropertyEstimate;

  @ManyToOne(() => ParkingType, { eager: true })
  @JoinColumn({ name: 'parking_type_id' })
  parkingType!: ParkingType;
}

