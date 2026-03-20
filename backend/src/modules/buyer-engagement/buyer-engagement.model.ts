import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import type { User } from '../user/user.model';
import type { PropertyEstimate } from '../property-estimate/property-estimate.model';

@Entity('buyer_engagement')
@Unique(['userId', 'propertyId'])
@Index(['userId'])
@Index(['propertyId'])
export class BuyerEngagement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('User', { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne('PropertyEstimate', { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: PropertyEstimate;

  @Column({ name: 'property_id' })
  propertyId!: string;

  @Column({ type: 'int' })
  budget!: number;

  @Column({ type: 'int' })
  bedrooms!: number;

  @Column({ name: 'surface_min', type: 'int' })
  surfaceMin!: number;

  @Column({ name: 'land_area', type: 'int', nullable: true })
  landArea?: number;

  @Column({ type: 'boolean', default: false })
  pool!: boolean;

  @Column({ name: 'financing_status', type: 'varchar', length: 50, nullable: true })
  financingStatus?: string | null;

  @Column({ name: 'engagement_level', type: 'int', default: 0 })
  engagementLevel!: number;

  @Column({ type: 'boolean', default: false })
  interested!: boolean;
}
