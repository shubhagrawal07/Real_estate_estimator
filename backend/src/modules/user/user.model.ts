import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import type { PropertyEstimate } from '../property-estimate/property-estimate.model';
import type { Zone } from '../zone/zone.model';
import type { Subscription } from '../subscription/subscription.model';

export enum UserRole {
  USER = 'user',
  AGENT = 'agent',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  username!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role!: UserRole;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailId?: string;

  @Column({ name: 'google_id', type: 'varchar', length: 255, nullable: true, unique: true })
  googleId?: string;

  @Column({ type: 'bigint', nullable: true })
  phoneNo?: number;

  @CreateDateColumn({ name: 'created_date' })
  createdDate!: Date;

  @OneToMany('PropertyEstimate', 'user')
  propertyEstimates!: PropertyEstimate[];

  @OneToMany('Zone', 'agent')
  zones!: Zone[];

  @OneToMany('Subscription', 'user')
  subscriptions!: Subscription[];
}
