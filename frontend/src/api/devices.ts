import { apiClient } from './client';
import type { DeviceItem, PairingCodeResponse, ExtensionStatusResponse } from './types';

export const devicesApi = {
  async getDevices(): Promise<DeviceItem[]> {
    const res = await apiClient.get<DeviceItem[]>('/devices');
    return res.data;
  },

  async createPairingCode(): Promise<PairingCodeResponse> {
    const res = await apiClient.post<PairingCodeResponse>('/devices/pairing-code');
    return res.data;
  },

  async revokeDevice(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/devices/${id}`);
    return res.data;
  },

  async getExtensionStatus(): Promise<ExtensionStatusResponse> {
    const res = await apiClient.get<ExtensionStatusResponse>('/devices/status');
    return res.data;
  },

  async autoLink(): Promise<{ deviceId: string; name: string; created: boolean }> {
    const res = await apiClient.post<{ deviceId: string; name: string; created: boolean }>('/devices/auto-link');
    return res.data;
  },
};

