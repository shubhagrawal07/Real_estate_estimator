/**
 * City Block Sales Data Model
 * Database entity for storing individual property sales records from DVF API
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('city_block_sales_data')
export class CityBlockSalesData {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 10 })
  @Index()
  idpar!: string; // Format: {code_insee}{padding}{cadastral_section} e.g., "83137000BY"

  @Column({ type: 'numeric' })
  sterr!: number; // Land area (m²)

  @Column({ type: 'numeric' })
  sbati!: number; // Built area (m²)

  @Column({ type: 'numeric' })
  price!: number; // Property value (€)

  @Column({ type: 'date' })
  date!: Date; // Mutation date

  @Column({ type: 'varchar', length: 50 })
  type!: string; // Property type (e.g., "APPARTEMENT", "MAISON")

  @CreateDateColumn({ name: 'created_date' })
  createdDate!: Date;
}
