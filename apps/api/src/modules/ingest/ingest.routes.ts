import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireDevice } from '../../middleware/requireDevice.js';
import { ingestLimiter } from '../../middleware/limiters.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../lib/errors.js';
import {
  ingestActivitySchema,
  ingestNotificationsSchema,
  ingestSwitchesSchema,
  type IngestActivityInput,
} from './ingest.schemas.js';
import { ingestService } from './ingest.service.js';

export const ingestRouter = Router();

ingestRouter.use(requireDevice);
ingestRouter.use(ingestLimiter);

function getDevice(req: Request): { id: string; userId: string; platform: 'chrome' | 'windows' } {
  if (!req.device) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid device credentials');
  }
  return req.device;
}

ingestRouter.post(
  '/activity',
  validate({ body: ingestActivitySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const device = getDevice(req);
      const input = req.body as IngestActivityInput;

      for (const event of input.events) {
        const source = event.source ?? 'browser';
        if (device.platform === 'windows' && source !== 'desktop') {
          throw new AppError(400, 'VALIDATION_ERROR', 'A windows device may send only source desktop');
        }
        if (device.platform === 'chrome' && source !== 'browser') {
          throw new AppError(400, 'VALIDATION_ERROR', 'A chrome device may send only source browser');
        }
      }

      const result = await ingestService.ingestActivity(device.userId, device.id, input);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

ingestRouter.post(
  '/switches',
  validate({ body: ingestSwitchesSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const device = getDevice(req);
      const result = await ingestService.ingestSwitches(device.userId, device.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

ingestRouter.post(
  '/notifications',
  validate({ body: ingestNotificationsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const device = getDevice(req);
      const result = await ingestService.ingestNotifications(device.userId, device.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

ingestRouter.post(
  '/heartbeat',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = ingestService.heartbeat();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);
