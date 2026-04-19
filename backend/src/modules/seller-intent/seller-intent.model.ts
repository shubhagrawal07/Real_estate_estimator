import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { User } from '../user/user.model';
import type { PropertyEstimate } from '../property-estimate/property-estimate.model';

export enum ProfileType {
  SELLER = 'SELLER',
  BUYER = 'BUYER',
  SELLER_BUYER = 'SELLER_BUYER',
  CURIOUS = 'CURIOUS',
}

export enum IntentType {
  SELL_INTENT = 'SELL_INTENT',
  HIGH_INTEREST = 'HIGH_INTEREST',
  ALERT_AVAILABLE = 'ALERT_AVAILABLE',
  AREA_INTEREST = 'AREA_INTEREST',
  AREA_WATCH = 'AREA_WATCH',
  QUESTION = 'QUESTION',
}

export enum Timeline {
  NOW = 'NOW',
  THREE_MONTHS = 'THREE_MONTHS',
  SIX_MONTHS = 'SIX_MONTHS',
  UNDEFINED = 'UNDEFINED',
}

export enum SellPreference {
  DISCREET = 'DISCREET',
  CLASSIC = 'CLASSIC',
  UNDEFINED = 'UNDEFINED',
}

@Entity('seller_intent')
export class SellerIntent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('User', { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('PropertyEstimate', { nullable: false })
  @JoinColumn({ name: 'property_id', referencedColumnName: 'propertyId' })
  property!: PropertyEstimate;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @Column({
    name: 'profile_type',
    type: 'enum',
    enum: ProfileType,
  })
  profileType!: ProfileType;

  @Column({
    name: 'intent_type',
    type: 'enum',
    enum: IntentType,
    nullable: true,
  })
  intentType?: IntentType | null;

  @Column({ name: 'target_price', type: 'int', nullable: true })
  targetPrice?: number | null;

  @Column({
    type: 'enum',
    enum: Timeline,
    nullable: true,
  })
  timeline?: Timeline | null;

  @Column({
    name: 'sell_preference',
    type: 'enum',
    enum: SellPreference,
    nullable: true,
  })
  sellPreference?: SellPreference | null;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'notif_sent', type: 'boolean', default: false })
  notifSent!: boolean;
}
