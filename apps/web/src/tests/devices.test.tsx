import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom/vitest';
import { DevicePairingSection } from '../features/devices/DevicePairingSection';
import type { DeviceItem, ExtensionStatusResponse } from '../api/types';

let mockDevices: DeviceItem[] = [
  {
    id: 'dev-1',
    name: 'Web Activity Time Tracker',
    platform: 'chrome',
    lastSeenAt: new Date().toISOString(),
    revokedAt: null,
  },
];

let mockStatus: ExtensionStatusResponse = {
  connected: true,
  activeDevice: {
    id: 'dev-1',
    name: 'Web Activity Time Tracker',
    platform: 'chrome',
    revokedAt: null,
    lastSeenAt: new Date().toISOString(),
  },
  todayStats: {
    activityCount: 5,
    switchCount: 2,
    lastDomain: 'github.com',
    lastEventAt: new Date().toISOString(),
  },
  extensionName: 'Web Activity Time Tracker',
  version: '2.5.0',
  syncEndpoint: 'http://127.0.0.1:8000/api/v1/ingest',
};

const server = setupServer(
  http.get('*/devices', () => {
    return HttpResponse.json(mockDevices);
  }),
  http.get('*/devices/status', () => {
    return HttpResponse.json(mockStatus);
  }),
);

describe('Device Pairing Section Feature', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  beforeEach(() => {
    mockDevices = [
      {
        id: 'dev-1',
        name: 'Web Activity Time Tracker',
        platform: 'chrome',
        lastSeenAt: new Date().toISOString(),
        revokedAt: null,
      },
    ];
    mockStatus = {
      ...mockStatus,
      connected: true,
    };
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('renders extension connection status when connected', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <DevicePairingSection />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Chrome Extension')).toBeInTheDocument();
    expect(await screen.findByTestId('extension-connected-badge')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders extension connection status when not connected', async () => {
    server.use(
      http.get('*/devices', () => HttpResponse.json([])),
      http.get('*/devices/status', () => HttpResponse.json({ ...mockStatus, connected: false })),
    );

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <DevicePairingSection />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Chrome Extension')).toBeInTheDocument();
    expect(await screen.findByTestId('extension-disconnected-badge')).toBeInTheDocument();
    expect(screen.getByText('Not Connected')).toBeInTheDocument();
  });
});
