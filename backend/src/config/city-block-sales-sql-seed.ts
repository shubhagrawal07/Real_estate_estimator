import { readFile } from 'fs/promises';
import path from 'path';
import type { DataSource, EntityManager } from 'typeorm';
import { logger } from '../utils/logger';

const SQL_RELATIVE_TO_SRC = path.join('sql', 'city_block_sales_data.sql');

/**
 * Resolves the seed SQL path for both `ts-node-dev` (src/) and compiled `dist/` runs.
 */
function resolveCityBlockSalesSqlPath(): string {
  return path.resolve(__dirname, '..', '..', SQL_RELATIVE_TO_SRC);
}

function splitInsertStatements(script: string): string[] {
  const trimmed = script.trim();
  if (trimmed.length === 0) return [];
  const normalized = trimmed.endsWith(';') ? trimmed : `${trimmed};`;
  return normalized
    .split(/;\s*\r?\n\s*(?=INSERT INTO public\.city_block_sales_data)/i)
    .map((chunk) => {
      const t = chunk.trim();
      return t.endsWith(';') ? t : `${t};`;
    })
    .filter((s) => s.length > 0);
}

async function runStatements(manager: EntityManager, statements: string[]): Promise<void> {
  for (const statement of statements) {
    await manager.query(statement);
  }
}

/**
 * Truncates `city_block_sales_data` and reloads rows from `backend/sql/city_block_sales_data.sql`.
 * Runs as a single transaction.
 */
export async function refreshCityBlockSalesDataFromSqlFile(dataSource: DataSource): Promise<void> {
  const sqlPath = resolveCityBlockSalesSqlPath();
  let script: string;
  try {
    script = await readFile(sqlPath, 'utf8');
  } catch (error) {
    logger.error('Could not read city block sales SQL seed file', {
      path: sqlPath,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const statements = splitInsertStatements(script);
  if (statements.length === 0) {
    logger.warn('City block sales SQL seed file contained no INSERT statements', { path: sqlPath });
    return;
  }

  await dataSource.transaction(async (manager) => {
    await manager.query('TRUNCATE TABLE public.city_block_sales_data RESTART IDENTITY CASCADE');
    await runStatements(manager, statements);
  });

  logger.info('City block sales data reloaded from SQL file', {
    path: sqlPath,
    insertStatements: statements.length,
  });
}
