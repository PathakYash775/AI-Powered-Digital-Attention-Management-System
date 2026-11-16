import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom/vitest';
import { DevicePairingSection } from '../features/devices/DevicePairingSection';
import { DevicesPage } from '../features/devices/DevicesPage';
import { MobileBottomNav } from '../components/navigation/MobileBottomNav';
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

    const matches = await screen.findAllByText('Chrome Extension');
    expect(matches[0]).toBeInTheDocument();
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

    const matches = await screen.findAllByText('Chrome Extension');
    expect(matches[0]).toBeInTheDocument();
    expect(await screen.findByTestId('extension-disconnected-badge')).toBeInTheDocument();
    expect(screen.getByText('Not Connected')).toBeInTheDocument();
  });

  it('renders telemetry stats, disconnect option, and installation instructions guide', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <DevicePairingSection />
      </QueryClientProvider>,
    );

    // Verify telemetry stats
    expect(await screen.findByText(/5 events synced today/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /disconnect/i })).toBeInTheDocument();

    // Verify installation guide toggle
    const guideToggle = screen.getByText(/view installation instructions/i);
    expect(guideToggle).toBeInTheDocument();
    fireEvent.click(guideToggle);

    expect(await screen.findByText(/how to install the chrome extension/i)).toBeInTheDocument();
  });

  it('renders Windows Desktop Tracker connection and telemetry when active', async () => {
    server.use(
      http.get('*/devices', () =>
        HttpResponse.json([
          {
            id: 'dev-win-1',
            name: 'DESKTOP-TEST (Windows Desktop)',
            platform: 'windows',
            lastSeenAt: new Date().toISOString(),
            revokedAt: null,
          },
        ]),
      ),
    );

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <DevicePairingSection />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Windows Desktop Tracker')).toBeInTheDocument();
    expect(await screen.findByText(/Active background session tracking/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /disconnect windows tracker/i })).toBeInTheDocument();
  });

  it('renders Android Mobile Tracker connection and telemetry when active', async () => {
    server.use(
      http.get('*/devices', () =>
        HttpResponse.json([
          {
            id: 'dev-android-1',
            name: 'Android Mobile Device',
            platform: 'android',
            lastSeenAt: new Date().toISOString(),
            revokedAt: null,
          },
        ]),
      ),
    );

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <DevicePairingSection />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Android Mobile Tracker')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /disconnect android tracker/i })).toBeInTheDocument();
    expect(screen.getByText(/Tracks foreground application usage and switches via Android/i)).toBeInTheDocument();
  });

  it('renders DevicesPage heading and subtitle on mobile view', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/devices']}>
        <QueryClientProvider client={qc}>
          <DevicesPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /connected devices/i })).toBeInTheDocument();
    expect(
      screen.getByText(/manage your companion chrome extension and windows desktop tracker/i),
    ).toBeInTheDocument();
  });

  it('renders MobileBottomNav with navigation tabs', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <MobileBottomNav />
      </MemoryRouter>,
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Devices')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });
});
