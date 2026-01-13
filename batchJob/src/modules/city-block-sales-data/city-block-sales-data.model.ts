import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('city_block_sales_data')
@Index(['codeInsee', 'section'], { unique: true })
export class CityBlockSalesData {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 10 })
  department!: string;

  @Column({ name: 'code_insee', type: 'varchar', length: 10 })
  codeInsee!: string;

  @Column({ type: 'varchar', length: 10 })
  section!: string;

  @Column({ name: 'anneemut_min', type: 'int' })
  anneemutMin!: number;

  @Column({ name: 'anneemut_max', type: 'int' })
  anneemutMax!: number;

  @Column({ name: 'apartment_count', type: 'int', default: 0 })
  apartmentCount!: number;

  @Column({ name: 'apartment_sbati', type: 'numeric', default: 0 })
  apartmentSbati!: number;

  @Column({ name: 'apartment_sterr', type: 'numeric', default: 0 })
  apartmentSterr!: number;

  @Column({ name: 'apartment_price', type: 'numeric', default: 0 })
  apartmentPrice!: number;

  @Column({ name: 'mansion_count', type: 'int', default: 0 })
  mansionCount!: number;

  @Column({ name: 'mansion_sbati', type: 'numeric', default: 0 })
  mansionSbati!: number;

  @Column({ name: 'mansion_sterr', type: 'numeric', default: 0 })
  mansionSterr!: number;

  @Column({ name: 'mansion_price', type: 'numeric', default: 0 })
  mansionPrice!: number;

  @UpdateDateColumn({ name: 'last_modified_date' })
  lastModifiedDate!: Date;
}
