import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Returns middleware that validates req[target] against the given Zod schema.
 * On failure, passes AppError(400) to next with the first error message.
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (result.success) {
      req[target] = result.data;
      next();
      return;
    }
    const first = result.error.errors[0];
    const message = first ? `${first.path.join('.')}: ${first.message}` : 'Validation failed';
    next(new AppError(message, 400));
  };
}

export function validateBody<T>(schema: z.ZodType<T>) {
  return validate(schema as ZodSchema, 'body');
}

export function validateParams<T>(schema: z.ZodType<T>) {
  return validate(schema as ZodSchema, 'params');
}

export function validateQuery<T>(schema: z.ZodType<T>) {
  return validate(schema as ZodSchema, 'query');
}
