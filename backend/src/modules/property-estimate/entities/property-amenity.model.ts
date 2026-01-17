import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { PropertyEstimate } from '../property-estimate.model';
import { Amenity } from './amenity.model';

@Entity('property_amenities')
export class PropertyAmenity {
  @PrimaryColumn({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @PrimaryColumn({ name: 'amenity_id', type: 'int' })
  amenityId!: number;

  @ManyToOne(() => PropertyEstimate, property => property.propertyAmenities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: PropertyEstimate;

  @ManyToOne(() => Amenity, { eager: true })
  @JoinColumn({ name: 'amenity_id' })
  amenity!: Amenity;
}

