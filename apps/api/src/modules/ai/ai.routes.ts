import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../lib/errors.js';
import {
  explainFindingSchema,
  assistantQuestionSchema,
  dailyBriefingQuerySchema,
  weeklyReportQuerySchema,
  type ExplainFindingInput,
  type AssistantQuestionInput,
} from './ai.schemas.js';
import { aiService } from './ai.service.js';

export const aiRouter = Router();

// Model info is publicly accessible for model transparency
aiRouter.get('/model-info', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const info = await aiService.getModelInfo();
    res.status(200).json(info);
  } catch (err) {
    next(err);
  }
});

aiRouter.use(requireAuth);

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
  }
  return req.userId;
}

// GET /api/v1/ai/daily-briefing - Personalized daily attention synthesis
aiRouter.get(
  '/daily-briefing',
  validate({ query: dailyBriefingQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const date = req.query.date as string | undefined;
      const briefing = await aiService.getDailyBriefing(userId, date);
      res.status(200).json(briefing);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/ai/weekly-report - Multi-day attention trend report
aiRouter.get(
  '/weekly-report',
  validate({ query: weeklyReportQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const date = req.query.date as string | undefined;
      const report = await aiService.getWeeklyReport(userId, date);
      res.status(200).json(report);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/ai/explain - Natural-language ML anomaly explanation
aiRouter.post(
  '/explain',
  validate({ body: explainFindingSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const input = req.body as ExplainFindingInput;
      const explanation = await aiService.explainFinding(userId, input);
      res.status(200).json(explanation);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/ai/assistant - Natural-language telemetry Q&A
aiRouter.post(
  '/assistant',
  validate({ body: assistantQuestionSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const input = req.body as AssistantQuestionInput;
      const response = await aiService.askAssistant(userId, input);
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
);

