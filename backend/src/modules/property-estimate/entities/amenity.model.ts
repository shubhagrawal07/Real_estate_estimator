import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('amenities')
export class Amenity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'price_impact', type: 'decimal', precision: 5, scale: 2, default: 0 })
  priceImpact!: number; // Percentage impact on price (e.g., 10.00 = 10%)
}

