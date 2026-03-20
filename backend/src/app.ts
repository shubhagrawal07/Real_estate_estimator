import express, { Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { mountRoutes } from './routes';
import { errorMiddleware } from './middleware/error.middleware';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
  }));
  app.use(express.json());
  app.use(limiter);

  app.get('/', (_req, res) => {
    res.json({ message: 'Real Estate Estimator API is running!' });
  });

  mountRoutes(app);

  app.use(errorMiddleware);

  return app;
}
