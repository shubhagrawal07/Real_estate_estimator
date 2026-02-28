import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import type { User } from '../user/user.model';
import type { PropertyEstimate } from '../property-estimate/property-estimate.model';

@Entity('favourite_property')
@Unique(['userId', 'propertyId'])
@Index(['userId'])
@Index(['propertyId'])
export class FavouriteProperty {
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

  @CreateDateColumn({ name: 'created_date' })
  createdDate!: Date;
}

