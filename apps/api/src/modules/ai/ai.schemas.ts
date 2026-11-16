import { z } from 'zod';

export const explainFindingSchema = z.object({
  findingType: z.enum([
    'context_switch_spike',
    'focus_score_drop',
    'distraction_surge',
    'prolonged_inactivity',
    'peak_window_shift',
    'general',
  ]),
  findingDetails: z.union([z.string(), z.record(z.unknown())]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const assistantQuestionSchema = z.object({
  question: z.string().min(2, 'Question is required').max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'model']),
        text: z.string().max(2000),
      })
    )
    .optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const dailyBriefingQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const weeklyReportQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type ExplainFindingInput = z.infer<typeof explainFindingSchema>;
export type AssistantQuestionInput = z.infer<typeof assistantQuestionSchema>;
export type DailyBriefingQuery = z.infer<typeof dailyBriefingQuerySchema>;
export type WeeklyReportQuery = z.infer<typeof weeklyReportQuerySchema>;
