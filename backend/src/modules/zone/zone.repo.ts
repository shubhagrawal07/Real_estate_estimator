import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { Zone } from './zone.model';

export class ZoneRepo {
  private repository: Repository<Zone>;

  constructor() {
    this.repository = AppDataSource.getRepository(Zone);
  }

  async findByZoneCode(zoneCode: string): Promise<Zone | null> {
    return this.repository.findOne({ where: { zoneCode } });
  }

  async findByZoneCodeWithAgent(zoneCode: string): Promise<Zone | null> {
    return this.repository.findOne({
      where: { zoneCode },
      relations: ['agent'],
    });
  }
}
