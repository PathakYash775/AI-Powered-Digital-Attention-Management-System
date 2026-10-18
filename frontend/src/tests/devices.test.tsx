import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom/vitest';
import { DevicePairingSection } from '../features/devices/DevicePairingSection';
import type { DeviceItem } from '../api/types';

let mockDevices: DeviceItem[] = [
  {
    id: 'dev-1',
    name: 'Work Chrome',
    platform: 'chrome',
    lastSeenAt: new Date().toISOString(),
    revokedAt: null,
  },
];

const server = setupServer(
  http.get('*/devices', () => {
    return HttpResponse.json(mockDevices);
  }),
  http.post('*/devices/pairing-code', () => {
    return HttpResponse.json({
      code: 'K7X9W2M4',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    });
  }),
  http.delete('*/devices/:id', ({ params }) => {
    mockDevices = mockDevices.map((d) =>
      d.id === params.id ? { ...d, revokedAt: new Date().toISOString() } : d,
    );
    return HttpResponse.json({ success: true, message: 'Device revoked' });
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
        name: 'Work Chrome',
        platform: 'chrome',
        lastSeenAt: new Date().toISOString(),
        revokedAt: null,
      },
    ];
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('renders connected devices table', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <DevicePairingSection />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Work Chrome')).toBeInTheDocument();
    expect(screen.getByText('● Active')).toBeInTheDocument();
  });

  it('generates and displays pairing code with countdown', async () => {
    const user = userEvent.setup();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <DevicePairingSection />
      </QueryClientProvider>,
    );

    const generateBtn = await screen.findByRole('button', { name: /\+ Generate Pairing Code/i });
    await user.click(generateBtn);

    expect(await screen.findByText('K7X9W2M4')).toBeInTheDocument();
    expect(screen.getByText(/Expires in/i)).toBeInTheDocument();
  });
});
