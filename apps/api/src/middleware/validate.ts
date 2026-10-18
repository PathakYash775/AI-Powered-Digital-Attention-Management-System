import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';

interface RequestValidationSchema {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

export function validate(schema: RequestValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as Request['query'];
      }
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as Request['params'];
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0];
        const path = firstIssue && firstIssue.path.length > 0 ? `${firstIssue.path.join('.')}: ` : '';
        const message = firstIssue ? `${path}${firstIssue.message}` : 'Validation failed';
        next(AppError.validation(message));
      } else {
        next(error);
      }
    }
  };
}
