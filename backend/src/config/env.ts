import * as dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

function parseOptionalBooleanEnv(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return defaultValue;
  const v = raw.trim().toLowerCase();
  if (['1', 'true', 'yes'].includes(v)) return true;
  if (['0', 'false', 'no'].includes(v)) return false;
  return defaultValue;
}

const requiredProductionVars = [
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DB_HOST',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
] as const;

/**
 * Validates that required environment variables are set in production.
 * Call from server startup; throws with a clear message if any are missing.
 */
export function validateEnv(): void {
  if (nodeEnv !== 'production') return;
  const missing: string[] = [];
  for (const key of requiredProductionVars) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for production: ${missing.join(', ')}. ` +
        'Set them in .env or the deployment environment.'
    );
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || process.env.USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'real_estate_db',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  },
  dvf: {
    baseUrl: process.env.DVF_API_BASE_URL || 'https://apidf-preprod.cerema.fr/dvf_opendata/mutations/',
    timeoutMs: parseInt(process.env.DVF_API_TIMEOUT_MS || '90000', 10),
  },
  /**
   * When true, truncates `city_block_sales_data` on startup and loads `backend/sql/city_block_sales_data.sql`.
   * Defaults to true when NODE_ENV is not production (local dev). Set to true explicitly to enable in production.
   */
  refreshCityBlockSalesDataOnStartup: parseOptionalBooleanEnv(
    process.env.REFRESH_CITY_BLOCK_SALES_DATA_ON_STARTUP,
    nodeEnv !== 'production'
  ),
  /** JSON map: location_code (full or code_insee prefix) → agent user UUID */
  agentByLocationMap: parseAgentByLocationMap(process.env.AGENT_BY_LOCATION_MAP),
};

function parseAgentByLocationMap(raw: string | undefined): Record<string, string> {
  if (!raw || raw.trim() === '') return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.length > 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}
