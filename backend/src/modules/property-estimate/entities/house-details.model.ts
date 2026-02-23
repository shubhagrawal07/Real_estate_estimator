import { Entity, Column, PrimaryColumn, OneToOne, JoinColumn } from 'typeorm';
import { PropertyEstimate } from '../property-estimate.model';

export enum PoolOption {
  POOL = 'pool',
  POSSIBLE = 'possible',
  NOT_POSSIBLE = 'not_possible',
}

/** Exterior layout quality: Basic 0%, Maintained garden +2%, Premium outdoor +3% */
export enum ExteriorLayoutQuality {
  BASIC = 'basic',
  MAINTAINED_GARDEN = 'maintained_garden',
  PREMIUM_OUTDOOR = 'premium_outdoor',
}

/** Number of shared walls: 0 = detached, 1 = semi-detached, 2 = two shared walls */
export type SharedWalls = 0 | 1 | 2;

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

  /** 0 = detached, 1 = one shared wall (semi-detached), 2 = two shared walls. Default derived from semiDetached if not set. */
  @Column({ name: 'shared_walls', type: 'int', default: 0 })
  sharedWalls!: number;

  @Column({
    name: 'exterior_layout_quality',
    type: 'enum',
    enum: ExteriorLayoutQuality,
    default: ExteriorLayoutQuality.BASIC,
  })
  exteriorLayoutQuality!: ExteriorLayoutQuality;

  @Column({
    name: 'pool_option',
    type: 'enum',
    enum: PoolOption,
    default: PoolOption.NOT_POSSIBLE,
  })
  poolOption!: PoolOption;
}

