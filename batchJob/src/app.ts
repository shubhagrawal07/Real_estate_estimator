import express, { Express } from 'express';
import cors from 'cors';
import { mountRoutes } from './routes';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/', (req, res) => {
    res.json({ message: 'Real Estate Data Processing API is running!' });
  });

  // Mount all routes
  mountRoutes(app);

  return app;
}