import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../lib/errors.js';
import { updateProfileSchema } from './profile.schemas.js';
import { profileService } from './profile.service.js';

export const profileRouter = Router();

profileRouter.use(requireAuth);

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
  }
  return req.userId;
}

profileRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(req);
    const profile = await profileService.getProfile(userId);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
});

profileRouter.patch(
  '/',
  validate({ body: updateProfileSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const profile = await profileService.updateProfile(userId, req.body);
      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  },
);
