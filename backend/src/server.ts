import { createApp } from './app';
import { initializeDatabase } from './config/db';
import { config, validateEnv } from './config/env';
import { logger } from './utils/logger';

async function startServer(): Promise<void> {
  try {
    validateEnv();
  } catch (error) {
    logger.error('Environment validation failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }

  try {
    await initializeDatabase();
  } catch (error) {
    logger.error('Database connection failed', {
      message: error instanceof Error ? error.message : String(error),
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      username: config.db.username,
    });
    logger.info('Ensure PostgreSQL is running (e.g. docker-compose up -d or brew services start postgresql@15)');
    process.exit(1);
  }

  try {
    const app = createApp();
    app.listen(config.port, () => {
      logger.info('Server started', { port: config.port, database: config.db.database });
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      logger.error('Port already in use', { port: config.port });
    } else {
      logger.error('Failed to start server', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    process.exit(1);
  }
}

startServer();
