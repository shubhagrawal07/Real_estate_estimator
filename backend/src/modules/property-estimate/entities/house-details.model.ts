import { Entity, Column, PrimaryColumn, OneToOne, JoinColumn } from 'typeorm';
import { PropertyEstimate } from '../property-estimate.model';

export enum PoolOption {
  POOL = 'pool',
  POSSIBLE = 'possible',
  NOT_POSSIBLE = 'not_possible',
}

@Entity('house_details')
export class HouseDetails {
  @PrimaryColumn({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @OneToOne(() => PropertyEstimate, property => property.houseDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: PropertyEstimate;

  @Column({ name: 'land_size', type: 'int', default: 100 })
  landSize!: number;

  @Column({ name: 'semi_detached', type: 'boolean', default: false })
  semiDetached!: boolean;

  @Column({
    name: 'pool_option',
    type: 'enum',
    enum: PoolOption,
    default: PoolOption.NOT_POSSIBLE,
  })
  poolOption!: PoolOption;
}

