import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { mountRoutes } from './routes';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
  }));
  app.use(express.json());

  // Health check
  app.get('/', (req, res) => {
    res.json({ message: 'Real Estate Estimator API is running!' });
  });

  // Mount all routes
  mountRoutes(app);

  return app;
}
