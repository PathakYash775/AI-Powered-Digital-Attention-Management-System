import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { pairLimiter } from '../../middleware/limiters.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../lib/errors.js';
import { deviceParamsSchema, pairDeviceSchema } from './devices.schemas.js';
import { devicesService } from './devices.service.js';

export const devicesRouter = Router();

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
  }
  return req.userId;
}

devicesRouter.post(
  '/pair',
  pairLimiter,
  validate({ body: pairDeviceSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await devicesService.pairDevice(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

devicesRouter.post(
  '/pairing-code',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const result = await devicesService.createPairingCode(userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

devicesRouter.get(
  '/status',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const status = await devicesService.getExtensionStatus(userId);
      res.status(200).json(status);
    } catch (err) {
      next(err);
    }
  },
);

devicesRouter.post(
  '/auto-link',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const result = await devicesService.autoLinkDevice(userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

devicesRouter.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const devices = await devicesService.getDevices(userId);
      res.status(200).json(devices);
    } catch (err) {
      next(err);
    }
  },
);

devicesRouter.delete(
  '/:id',
  requireAuth,
  validate({ params: deviceParamsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      await devicesService.revokeDevice(userId, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
