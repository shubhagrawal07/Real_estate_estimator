import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { PropertyEstimate } from '../property-estimate.model';
import { Criteria } from './criteria.model';

@Entity('property_criteria')
export class PropertyCriteria {
  @PrimaryColumn({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @PrimaryColumn({ name: 'criteria_id', type: 'int' })
  criteriaId!: number;

  @ManyToOne(() => PropertyEstimate, property => property.propertyCriteria, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: PropertyEstimate;

  @ManyToOne(() => Criteria, { eager: true })
  @JoinColumn({ name: 'criteria_id' })
  criteria!: Criteria;
}

