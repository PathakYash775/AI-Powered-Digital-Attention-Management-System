import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, err.message);
    }
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof z.ZodError) {
    const firstIssue = err.issues[0];
    const path = firstIssue && firstIssue.path.length > 0 ? `${firstIssue.path.join('.')}: ` : '';
    const message = firstIssue ? `${path}${firstIssue.message}` : 'Validation error';
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message,
      },
    });
    return;
  }

  // Any syntax error from malformed JSON in body-parser
  if (err instanceof SyntaxError && 'status' in err && (err as { status: unknown }).status === 400) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON payload',
      },
    });
    return;
  }

  // Catch-all: log detailed error internally, return generic INTERNAL to client
  logger.error({ err }, 'Unhandled server error');

  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'Internal server error',
    },
  });
}
