import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('parking_types')
export class ParkingType {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'price_impact', type: 'decimal', precision: 5, scale: 2, default: 0 })
  priceImpact!: number; // Percentage impact on price (e.g., 15.00 = 15%)
}

