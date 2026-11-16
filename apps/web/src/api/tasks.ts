import { apiClient } from './client';
import type {
  Task,
  TaskStats,
  TaskPrioritizationResult,
  TaskPriority,
  TaskStatus,
} from './types';

export interface CreateTaskPayload {
  title: string;
  description?: string;
  category?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  estimatedMinutes?: number;
  deadline?: string;
  order?: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  category?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  estimatedMinutes?: number;
  deadline?: string | null;
  order?: number;
}

export const tasksApi = {
  async listTasks(query?: { status?: TaskStatus; category?: string; priority?: TaskPriority; limit?: number }): Promise<Task[]> {
    const res = await apiClient.get<Task[]>('/tasks', { params: query });
    return res.data;
  },

  async getTask(id: string): Promise<Task> {
    const res = await apiClient.get<Task>(`/tasks/${id}`);
    return res.data;
  },

  async createTask(payload: CreateTaskPayload): Promise<Task> {
    const res = await apiClient.post<Task>('/tasks', payload);
    return res.data;
  },

  async updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
    const res = await apiClient.patch<Task>(`/tasks/${id}`, payload);
    return res.data;
  },

  async deleteTask(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },

  async getTaskStats(): Promise<TaskStats> {
    const res = await apiClient.get<TaskStats>('/tasks/stats');
    return res.data;
  },

  async getAiPrioritization(): Promise<TaskPrioritizationResult> {
    const res = await apiClient.get<TaskPrioritizationResult>('/tasks/ai-prioritize');
    return res.data;
  },

  async applyPriorities(updates: Array<{ id: string; priority: TaskPriority; order?: number }>): Promise<{ updatedCount: number; tasks: Task[] }> {
    const res = await apiClient.post<{ updatedCount: number; tasks: Task[] }>('/tasks/apply-priorities', { updates });
    return res.data;
  },
};
