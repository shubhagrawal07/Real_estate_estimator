import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('property_estimates')
export class PropertyEstimate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  address!: string;

  @Column()
  city!: string;

  @Column()
  state!: string;

  @Column()
  zipCode!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  squareFeet!: number;

  @Column('int')
  bedrooms!: number;

  @Column('decimal', { precision: 4, scale: 1 })
  bathrooms!: number;

  @Column('int', { nullable: true })
  yearBuilt?: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  estimatedPrice?: number;

  @CreateDateColumn()
  createdAt!: Date;
}
