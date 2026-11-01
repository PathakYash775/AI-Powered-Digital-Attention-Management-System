import { describe, it, expect, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom/vitest';
import { FocusSummaryWidget } from '../features/activity/FocusSummaryWidget';

const mockWeeklySummaryWithData = {
  today: {
    date: '2026-10-28',
    hasData: true,
    focusScore: 78,
    totalScreenMinutes: 135,
    activeMinutes: 110,
    distractedMinutes: 15,
    switchCount: 8,
    completedFocusSessions: 3,
    status: 'Good Focus',
  },
  weeklyAverage: 82,
  daysWithDataCount: 3,
  days: [
    { day: 'Mon', date: '2026-10-26', isToday: false, hasData: true, score: 85, activeMinutes: 120, totalScreenMinutes: 140 },
    { day: 'Tue', date: '2026-10-27', isToday: false, hasData: true, score: 83, activeMinutes: 100, totalScreenMinutes: 120 },
    { day: 'Wed', date: '2026-10-28', isToday: true, hasData: true, score: 78, activeMinutes: 110, totalScreenMinutes: 135 },
    { day: 'Thu', date: '2026-10-29', isToday: false, hasData: false, score: null, activeMinutes: 0, totalScreenMinutes: 0 },
    { day: 'Fri', date: '2026-10-30', isToday: false, hasData: false, score: null, activeMinutes: 0, totalScreenMinutes: 0 },
    { day: 'Sat', date: '2026-10-31', isToday: false, hasData: false, score: null, activeMinutes: 0, totalScreenMinutes: 0 },
    { day: 'Sun', date: '2026-11-01', isToday: false, hasData: false, score: null, activeMinutes: 0, totalScreenMinutes: 0 },
  ],
};

const mockWeeklySummaryEmpty = {
  today: {
    date: '2026-10-28',
    hasData: false,
    focusScore: null,
    totalScreenMinutes: 0,
    activeMinutes: 0,
    distractedMinutes: 0,
    switchCount: 0,
    completedFocusSessions: 0,
    status: 'No activity recorded yet',
  },
  weeklyAverage: null,
  daysWithDataCount: 0,
  days: [
    { day: 'Mon', date: '2026-10-26', isToday: false, hasData: false, score: null, activeMinutes: 0, totalScreenMinutes: 0 },
    { day: 'Tue', date: '2026-10-27', isToday: false, hasData: false, score: null, activeMinutes: 0, totalScreenMinutes: 0 },
    { day: 'Wed', date: '2026-10-28', isToday: true, hasData: false, score: null, activeMinutes: 0, totalScreenMinutes: 0 },
    { day: 'Thu', date: '2026-10-29', isToday: false, hasData: false, score: null, activeMinutes: 0, totalScreenMinutes: 0 },
    { day: 'Fri', date: '2026-10-30', isToday: false, hasData: false, score: null, activeMinutes: 0, totalScreenMinutes: 0 },
    { day: 'Sat', date: '2026-10-31', isToday: false, hasData: false, score: null, activeMinutes: 0, totalScreenMinutes: 0 },
    { day: 'Sun', date: '2026-11-01', isToday: false, hasData: false, score: null, activeMinutes: 0, totalScreenMinutes: 0 },
  ],
};

let currentResponse: any = mockWeeklySummaryWithData;
let shouldFail = false;


const server = setupServer(
  http.get('*/analytics/weekly-summary', () => {
    if (shouldFail) {
      return new HttpResponse(null, { status: 500 });
    }
    return HttpResponse.json(currentResponse);
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  currentResponse = mockWeeklySummaryWithData;
  shouldFail = false;
});
afterAll(() => server.close());

function renderWidget() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <FocusSummaryWidget />
    </QueryClientProvider>
  );
}

describe('FocusSummaryWidget', () => {
  it('renders the My Focus button with real score when data is available', async () => {
    currentResponse = mockWeeklySummaryWithData;
    renderWidget();

    expect(screen.getByRole('button', { name: /toggle my focus summary/i })).toBeInTheDocument();
    expect(screen.getByText('My Focus')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Focus: 78/100')).toBeInTheDocument();
    });
  });

  it('displays "No activity recorded yet" when user has no tracked activity', async () => {
    currentResponse = mockWeeklySummaryEmpty;
    renderWidget();

    await waitFor(() => {
      expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
    });
  });

  it('opens popup panel on click and displays today metrics, status, and weekly average', async () => {
    const user = userEvent.setup();
    currentResponse = mockWeeklySummaryWithData;
    renderWidget();

    const trigger = screen.getByRole('button', { name: /toggle my focus summary/i });
    await user.click(trigger);

    // Verify popup panel opened
    expect(screen.getByRole('dialog', { name: /my focus summary/i })).toBeInTheDocument();
    expect(screen.getByText('My Focus Summary')).toBeInTheDocument();

    // Verify Today's Focus Score and Status
    await waitFor(() => {
      expect(screen.getByText('78')).toBeInTheDocument();
      expect(screen.getByText('Good Focus')).toBeInTheDocument();
    });

    // Verify Weekly Average
    expect(screen.getByText('82 / 100')).toBeInTheDocument();

    // Verify Today's Screen Time (135 min = 2 hr 15 min)
    expect(screen.getByText(/2 hr 15 min/i)).toBeInTheDocument();

    // Verify Distraction Summary
    expect(screen.getByText('8 app switches')).toBeInTheDocument();
    expect(screen.getByText('15 min distracted')).toBeInTheDocument();

    // Verify Focus Sessions
    expect(screen.getByText('3 completed')).toBeInTheDocument();

    // Verify Weekly view Monday-Sunday with Today highlighted
    expect(screen.getByText('This Week (Mon – Sun)')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('closes the panel when the close button is clicked', async () => {
    const user = userEvent.setup();
    currentResponse = mockWeeklySummaryWithData;
    renderWidget();

    const trigger = screen.getByRole('button', { name: /toggle my focus summary/i });
    await user.click(trigger);

    expect(screen.getByRole('dialog', { name: /my focus summary/i })).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close focus summary/i });
    await user.click(closeBtn);

    expect(screen.queryByRole('dialog', { name: /my focus summary/i })).not.toBeInTheDocument();
  });

  it('shows error state gracefully if fetching fails', async () => {
    const user = userEvent.setup();
    shouldFail = true;
    renderWidget();

    const trigger = screen.getByRole('button', { name: /toggle my focus summary/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/unable to load focus summary/i)).toBeInTheDocument();
    });
  });
});
