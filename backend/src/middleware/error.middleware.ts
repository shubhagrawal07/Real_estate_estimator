import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger';

/**
 * Wraps an async route handler so rejected promises are passed to next(err).
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Centralized error middleware. Logs errors internally and returns a safe
 * response without leaking stack traces or internal details.
 */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  const statusCode = getStatusCode(err);

  logger.error(message, {
    name: err instanceof Error ? err.name : undefined,
    ...(err instanceof Error && err.stack ? { stack: err.stack } : {}),
  });

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

function getStatusCode(err: unknown): number {
  if (typeof err !== 'object' || err === null) return 500;
  const code = (err as { statusCode?: number }).statusCode;
  if (typeof code === 'number' && code >= 400 && code < 600) return code;
  return 500;
}
