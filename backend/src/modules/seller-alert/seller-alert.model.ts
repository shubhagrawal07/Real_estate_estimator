import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { User } from '../user/user.model';
import type { PropertyEstimate } from '../property-estimate/property-estimate.model';

export const SELLER_ALERT_TYPE_BUYER_ABOVE_TRIGGER = 'buyer_above_trigger';

@Entity('seller_alerts')
@Index(['userId'])
@Index(['propertyId'])
export class SellerAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('PropertyEstimate', { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: PropertyEstimate;

  @Column({ name: 'property_id' })
  propertyId!: string;

  @ManyToOne('User', { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  read!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
