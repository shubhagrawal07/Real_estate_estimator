import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { PropertyEstimate } from '../property-estimate.model';
import { Feature } from './feature.model';

@Entity('property_features')
export class PropertyFeature {
  @PrimaryColumn({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @PrimaryColumn({ name: 'feature_id', type: 'int' })
  featureId!: number;

  @ManyToOne(() => PropertyEstimate, property => property.propertyFeatures, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: PropertyEstimate;

  @ManyToOne(() => Feature, { eager: true })
  @JoinColumn({ name: 'feature_id' })
  feature!: Feature;
}

