import { apiClient } from './client';
import type { CreateGoalPayload, Goal, UpdateGoalPayload } from './types';

export const goalsApi = {
  async getGoals(): Promise<Goal[]> {
    const res = await apiClient.get<Goal[]>('/goals');
    return res.data;
  },

  async createGoal(data: CreateGoalPayload): Promise<Goal> {
    const res = await apiClient.post<Goal>('/goals', data);
    return res.data;
  },

  async updateGoal(id: string, data: UpdateGoalPayload): Promise<Goal> {
    const res = await apiClient.patch<Goal>(`/goals/${id}`, data);
    return res.data;
  },

  async deleteGoal(id: string): Promise<void> {
    await apiClient.delete(`/goals/${id}`);
  },
};
