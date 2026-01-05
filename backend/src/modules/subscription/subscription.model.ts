import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import type { User } from '../user/user.model';

export enum SubscriptionType {
  TRIAL = 'trial',
  BASIC = 'basic',
  PRO = 'pro',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export enum PaymentStatus {
  PAID = 'paid',
  PENDING = 'pending',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('User', { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({
    name: 'subscription_type',
    type: 'enum',
    enum: SubscriptionType,
  })
  subscriptionType!: SubscriptionType;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
  })
  status!: SubscriptionStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: Date;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
  })
  paymentStatus!: PaymentStatus;

  @Column({ name: 'net_amount_paid', type: 'int' })
  netAmountPaid!: number;
}
