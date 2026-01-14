import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { CityBlockSalesData } from './city-block-sales-data.model';

export interface CityBlockSalesDataInput {
  department: string;
  codeInsee: string;
  section: string;
  anneemutMin: number;
  anneemutMax: number;
  apartmentCount: number;
  apartmentSbati: number;
  apartmentSterr: number;
  apartmentPrice: number;
  mansionCount: number;
  mansionSbati: number;
  mansionSterr: number;
  mansionPrice: number;
}

export class CityBlockSalesDataRepo {
  private repository: Repository<CityBlockSalesData>;

  constructor() {
    this.repository = AppDataSource.getRepository(CityBlockSalesData);
  }

  /**
   * Upsert (insert or update) a city block sales data record
   * Uses code_insee + section as unique identifier
   */
  async upsert(data: CityBlockSalesDataInput): Promise<CityBlockSalesData> {
    const existing = await this.repository.findOne({
      where: {
        codeInsee: data.codeInsee,
        section: data.section,
      },
    });

    if (existing) {
      // Update existing record
      existing.department = data.department;
      existing.anneemutMin = data.anneemutMin;
      existing.anneemutMax = data.anneemutMax;
      existing.apartmentCount = data.apartmentCount;
      existing.apartmentSbati = data.apartmentSbati;
      existing.apartmentSterr = data.apartmentSterr;
      existing.apartmentPrice = data.apartmentPrice;
      existing.mansionCount = data.mansionCount;
      existing.mansionSbati = data.mansionSbati;
      existing.mansionSterr = data.mansionSterr;
      existing.mansionPrice = data.mansionPrice;
      return this.repository.save(existing);
    } else {
      // Create new record
      const newRecord = this.repository.create(data);
      return this.repository.save(newRecord);
    }
  }

  /**
   * Upsert multiple records in a transaction
   */
  async upsertMany(dataArray: CityBlockSalesDataInput[]): Promise<CityBlockSalesData[]> {
    const results: CityBlockSalesData[] = [];

    // Use a transaction for better performance and consistency
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      for (const data of dataArray) {
        const existing = await transactionalEntityManager.findOne(CityBlockSalesData, {
          where: {
            codeInsee: data.codeInsee,
            section: data.section,
          },
        });

        if (existing) {
          // Update existing record
          existing.department = data.department;
          existing.anneemutMin = data.anneemutMin;
          existing.anneemutMax = data.anneemutMax;
          existing.apartmentCount = data.apartmentCount;
          existing.apartmentSbati = data.apartmentSbati;
          existing.apartmentSterr = data.apartmentSterr;
          existing.apartmentPrice = data.apartmentPrice;
          existing.mansionCount = data.mansionCount;
          existing.mansionSbati = data.mansionSbati;
          existing.mansionSterr = data.mansionSterr;
          existing.mansionPrice = data.mansionPrice;
          results.push(await transactionalEntityManager.save(existing));
        } else {
          // Create new record
          const newRecord = transactionalEntityManager.create(CityBlockSalesData, data);
          results.push(await transactionalEntityManager.save(newRecord));
        }
      }
    });

    return results;
  }

  /**
   * Find by code_insee and section
   */
  async findByCodeInseeAndSection(
    codeInsee: string,
    section: string
  ): Promise<CityBlockSalesData | null> {
    return this.repository.findOne({
      where: {
        codeInsee,
        section,
      },
    });
  }

  /**
   * Find all records for a given code_insee
   */
  async findByCodeInsee(codeInsee: string): Promise<CityBlockSalesData[]> {
    return this.repository.find({
      where: { codeInsee },
      order: { section: 'ASC' },
    });
  }
}
