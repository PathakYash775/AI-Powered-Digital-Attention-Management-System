import { z } from 'zod';

export const recommendationCategorySchema = z.enum([
  'focus_improvement',
  'productivity_tip',
  'attention_recovery',
  'pattern_optimization',
]);

export const recommendationStatusSchema = z.enum([
  'pending',
  'accepted',
  'dismissed',
  'completed',
]);

export const listRecommendationsQuerySchema = z.object({
  status: recommendationStatusSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

export const updateRecommendationStatusSchema = z.object({
  status: recommendationStatusSchema,
});

export const recommendationParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListRecommendationsQuery = z.infer<typeof listRecommendationsQuerySchema>;
export type UpdateRecommendationStatusInput = z.infer<typeof updateRecommendationStatusSchema>;

