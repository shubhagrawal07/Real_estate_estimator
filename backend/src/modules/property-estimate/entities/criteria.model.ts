import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('criteria')
export class Criteria {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'price_impact', type: 'decimal', precision: 5, scale: 2, default: 0 })
  priceImpact!: number; // Percentage impact on price (e.g., 5.00 = 5%)
}

