import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.deviceToken',
      'req.body.refreshToken',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      'token',
      'tokenHash',
      'codeHash',
    ],
    remove: true,
  },
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: env.NODE_ENV !== 'test',
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
