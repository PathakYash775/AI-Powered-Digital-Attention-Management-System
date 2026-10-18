import { describe, it, expect, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom/vitest';
import { FocusPage } from '../features/focus/FocusPage';

const mockPastSessions = [
  {
    id: 'f-1',
    plannedMin: 25,
    status: 'completed',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    endedAt: new Date(Date.now() - 2100000).toISOString(),
    interruptionCount: 0,
  },
];

let activeSessionMock: any = null;

const server = setupServer(
  http.get('*/focus-sessions/active', () => {
    return HttpResponse.json(activeSessionMock);
  }),
  http.get('*/focus-sessions', () => {
    return HttpResponse.json({ items: mockPastSessions, nextCursor: null });
  }),
  http.post('*/focus-sessions/start', async ({ request }) => {
    const body = (await request.json()) as { plannedMin: number };
    activeSessionMock = {
      id: 'f-new',
      plannedMin: body.plannedMin,
      status: 'active',
      startedAt: new Date().toISOString(),
      endedAt: null,
      interruptionCount: 0,
    };
    return HttpResponse.json(activeSessionMock, { status: 201 });
  }),
  http.post('*/focus-sessions/:id/stop', () => {
    activeSessionMock = null;
    return HttpResponse.json({ id: 'f-new', status: 'completed' });
  }),
);

describe('Focus Sessions Feature with Timer Clock', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    activeSessionMock = null;
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('renders timer clock with 25:00 default and preset options', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FocusPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Focus Sessions & Timer/i)).toBeInTheDocument();
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('Ready to Focus')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Focus Session/i })).toBeInTheDocument();
    expect(screen.getByText(/Recent Focus Sessions/i)).toBeInTheDocument();
  });

  it('allows selecting different duration presets', async () => {
    const user = userEvent.setup();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FocusPage />
      </QueryClientProvider>,
    );

    const sprintBtn = await screen.findByRole('button', { name: /15m Sprint/i });
    await user.click(sprintBtn);

    expect(screen.getByText('15:00')).toBeInTheDocument();
  });

  it('starts session and switches to active countdown mode', async () => {
    const user = userEvent.setup();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FocusPage />
      </QueryClientProvider>,
    );

    const startBtn = await screen.findByRole('button', { name: /Start Focus Session/i });
    await user.click(startBtn);

    expect(await screen.findByText(/Focus Active/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Complete Session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /End Early/i })).toBeInTheDocument();
  });
});
