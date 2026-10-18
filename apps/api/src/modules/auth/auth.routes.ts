import { Router, type CookieOptions, type Request, type Response, type NextFunction } from 'express';
import { env } from '../../config/env.js';
import { validate } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/limiters.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { authService } from './auth.service.js';

export const authRouter = Router();

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
};

authRouter.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.register(req.body);
      res.cookie('rt', result.refreshToken, refreshCookieOptions);
      res.status(201).json({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.login(req.body);
      res.cookie('rt', result.refreshToken, refreshCookieOptions);
      res.status(200).json({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.rt as string | undefined;
      const result = await authService.refresh(token);
      res.cookie('rt', result.refreshToken, refreshCookieOptions);
      res.status(200).json({
        accessToken: result.accessToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.rt as string | undefined;
      await authService.logout(token);
      res.clearCookie('rt', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
