import { apiClient } from './client';
import type { Profile } from './types';

export const profileApi = {
  async getProfile(): Promise<Profile> {
    const res = await apiClient.get<Profile>('/profile');
    return res.data;
  },

  async updateProfile(data: Partial<Profile>): Promise<Profile> {
    const res = await apiClient.patch<Profile>('/profile', data);
    return res.data;
  },
};
