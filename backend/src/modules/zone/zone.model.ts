import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { User } from '../user/user.model';

export enum ZoneStatus {
  ASSIGNED = 'Assigned',
  AVAILABLE = 'available',
}

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  zoneId!: string;

  @Column({ type: 'varchar', length: 255 })
  zoneCode!: string;

  @Column({
    type: 'enum',
    enum: ZoneStatus,
    default: ZoneStatus.AVAILABLE,
  })
  status!: ZoneStatus;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent?: User;

  @Column({ name: 'agent_id', nullable: true })
  agentId?: string;
}
