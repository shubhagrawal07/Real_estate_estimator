import { createApp } from './app';
import { initializeDatabase } from './config/db';
import { config } from './config/env';

async function startServer(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();
  } catch (error) {
    console.error('\n❌ Database Connection Failed!');
    console.error('Please make sure PostgreSQL is running and configured correctly.');
    console.error('\nTo start PostgreSQL:');
    console.error('  Option 1: docker-compose up -d');
    console.error('  Option 2: brew services start postgresql@15 (macOS)');
    console.error('\nCheck your .env file for database credentials.');
    console.error(`\nAttempted connection to: ${config.db.host}:${config.db.port}`);
    console.error(`Database: ${config.db.database}`);
    console.error(`Username: ${config.db.username}`);
    console.error('\nServer will not start without database connection.\n');
    process.exit(1);
  }

  try {
    // Create Express app
    const app = createApp();

    // Start server
    app.listen(config.port, () => {
      console.log(`\n✅ Server is running on http://localhost:${config.port}`);
      console.log(`✅ Database connected: ${config.db.database}\n`);
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EADDRINUSE') {
      console.error('\n❌ Port 3001 is already in use!');
      console.error('Another server is running on this port.');
      console.error('\nTo fix this:');
      console.error('  1. Stop the other server process');
      console.error('  2. Or change PORT in .env file to use a different port');
      console.error('\nTo find and kill the process:');
      console.error('  lsof -ti:3001 | xargs kill -9\n');
    } else {
      console.error('Failed to start server:', error);
    }
    process.exit(1);
  }
}

startServer();
