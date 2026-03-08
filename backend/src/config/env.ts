import * as dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

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
};
