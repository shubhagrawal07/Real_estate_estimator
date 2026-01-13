import 'reflect-metadata';
import { createApp } from './app';
import { config } from './config/env';
import { initializeDatabase } from './config/db';

async function startServer(): Promise<void> {
  try {
    // Initialize database connection
    await initializeDatabase();

    // Create Express app
    const app = createApp();

    // Start server
    app.listen(config.port, () => {
      console.log(`\n✅ Real Estate Data Processing API is running on http://localhost:${config.port}`);
      console.log(`✅ API endpoint: POST http://localhost:${config.port}/process-data\n`);
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${config.port} is already in use!`);
      console.error('Another server is running on this port.');
      console.error('\nTo fix this:');
      console.error('  1. Stop the other server process');
      console.error('  2. Or change PORT in .env file to use a different port');
      console.error(`\nTo find and kill the process:`);
      console.error(`  lsof -ti:${config.port} | xargs kill -9\n`);
    } else {
      console.error('Failed to start server:', error);
    }
    process.exit(1);
  }
}

startServer();