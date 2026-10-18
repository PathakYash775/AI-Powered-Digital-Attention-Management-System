import { describe, it, expect, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom/vitest';
import { ActivityPage } from '../features/activity/ActivityPage';

const mockReport = {
  summary: {
    date: '2026-10-18',
    totalScreenSec: 0,
    activeSec: 0,
    idleSec: 0,
    switchCount: 0,
    notificationCount: 0,
    topSites: [],
  },
  hourlyPatterns: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    activeSec: 0,
    idleSec: 0,
    switchCount: 0,
    notificationCount: 0,
  })),
  categoryBreakdown: {
    productive: 0,
    communication: 0,
    entertainment: 0,
    social: 0,
    other: 0,
  },
  focusSessions: [],
  goals: [],
};

const mockDevices = [
  {
    id: 'dev-1',
    name: 'Windows Workstation',
    platform: 'chrome',
    lastSeenAt: new Date().toISOString(),
    revokedAt: null,
  },
];

const server = setupServer(
  http.get('*/activity/report', () => {
    return HttpResponse.json(mockReport);
  }),
  http.get('*/devices', () => {
    return HttpResponse.json(mockDevices);
  }),
  http.get('*/activity/sessions', () => {
    return HttpResponse.json({ items: [], nextCursor: null });
  }),
  http.get('*/activity/switches', () => {
    return HttpResponse.json({ items: [], nextCursor: null });
  }),
  http.get('*/activity/notifications', () => {
    return HttpResponse.json({ items: [], nextCursor: null });
  }),
);

describe('Activity Tracking & Monitoring UI (FocusIQ)', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('renders exact header, status pill and privacy notice', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ActivityPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Activity Tracking & Monitoring/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: ACTIVE/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Safeguard Active:/i)).toBeInTheDocument();
  });

  it('renders the 4 metric cards matching the design', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ActivityPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Total Screen Time/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Task Switches/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Registered Device/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Applications/i)).toBeInTheDocument();
    expect(screen.getByText('Windows Workstation')).toBeInTheDocument();
  });

  it('renders the Hourly Activity & Focus Distribution card and empty state', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ActivityPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Hourly Activity & Focus Distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/No Hourly Activity Recorded Yet/i)).toBeInTheDocument();
  });
});
