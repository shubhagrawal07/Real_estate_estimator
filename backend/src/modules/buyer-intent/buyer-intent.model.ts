import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import type { User } from '../user/user.model';
import type { PropertyEstimate } from '../property-estimate/property-estimate.model';

export enum BuyerIntentType {
  HIGH_INTEREST = 'HIGH_INTEREST',
  ALERT_AVAILABLE = 'ALERT_AVAILABLE',
  AREA_INTEREST = 'AREA_INTEREST',
  QUESTION = 'QUESTION',
}

@Entity('buyer_intent')
@Unique(['userId', 'propertyId', 'intentType'])
@Index(['userId'])
@Index(['propertyId'])
export class BuyerIntent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('User', { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('PropertyEstimate', { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: PropertyEstimate;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @Column({ name: 'intent_type', type: 'varchar', length: 32 })
  intentType!: BuyerIntentType;

  @Column({ name: 'notif_sent', type: 'boolean', default: false })
  notifSent!: boolean;

  @Column({ type: 'int', nullable: true })
  budget?: number | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  message?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
