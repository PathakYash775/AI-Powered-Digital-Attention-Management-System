import { describe, it, expect, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom/vitest';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';

const mockWeeklySummary = {
  today: {
    date: '2026-10-28',
    hasData: true,
    focusScore: 78,
    totalScreenMinutes: 135,
    activeMinutes: 110,
    distractedMinutes: 15,
    switchCount: 8,
    completedFocusSessions: 2,
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

const mockFocusScore = {
  date: '2026-10-28',
  focusScore: 78,
  rating: 'Good',
  metrics: {
    productiveMinutes: 110,
    distractedMinutes: 15,
    productiveRatioPercent: 88,
    switchCount: 8,
    interruptionIndex: 8,
  },
  recommendation: 'Steady flow state achieved.',
};

const mockDistractions = {
  date: '2026-10-28',
  distractionCount: 3,
  distractedMinutes: 15,
  distractionRatePercent: 12,
  switchCount: 8,
  topDistractingSources: [],
  riskLevel: 'low',
};

const mockDaily = {
  date: '2026-10-28',
  attentionScore: 78,
  totalScreenMinutes: 135,
  activeMinutes: 110,
  idleMinutes: 25,
  focusedMinutes: 110,
  distractedMinutes: 15,
  communicationMinutes: 10,
  switchCount: 8,
  notificationCount: 2,
  byCategory: { productive: 110, social: 15, entertainment: 0, communication: 10, other: 0 },
  topApps: [{ name: 'Visual Studio Code', durationSec: 6600 }],
  topSites: [{ domain: 'github.com', durationSec: 3600 }],
  hourly: [],
};

const mockSummary = {
  date: '2026-10-28',
  focusScore: 78,
  rating: 'Good Focus',
  totalScreenMinutes: 135,
  activeMinutes: 110,
  focusedMinutes: 110,
  distractedMinutes: 15,
  distractionRatePercent: 12,
  switchCount: 8,
  topDistraction: 'Social Media',
  topProductive: 'Visual Studio Code',
  summaryStatement: 'Great job maintaining focus on core projects.',
};

const mockInsights = {
  date: '2026-10-28',
  insightsCount: 2,
  insights: [
    { type: 'tip', title: 'Deep Work Rhythm', message: 'Long focus streaks observed in the morning.' },
  ],
};

const mockPredictions = {
  timestamp: '2026-10-28T12:00:00Z',
  featuresUsed: {
    appName: 'Visual Studio Code',
    category: 'productive',
    hoursUsed: 2.0,
    dayUsed: 'Wednesday',
    numberEvents: 100,
    numberInteractions: 2000,
    switches: 8,
    eventSpan: 120,
  },
  prediction: {
    attentionScore: 80,
    isDistracted: false,
    distractionProbability: 0.15,
    riskLevel: 'low',
    modelEngine: 'ml_model',
  },
  insights: 'High productivity engagement detected.',
};

let currentWeekly: any = mockWeeklySummary;
let shouldFail = false;

const server = setupServer(
  http.get('*/analytics/weekly-summary', () => {
    if (shouldFail) return new HttpResponse(null, { status: 500 });
    return HttpResponse.json(currentWeekly);
  }),
  http.get('*/analytics/focus-score', () => {
    if (shouldFail) return new HttpResponse(null, { status: 500 });
    return HttpResponse.json(mockFocusScore);
  }),
  http.get('*/analytics/distractions', () => {
    if (shouldFail) return new HttpResponse(null, { status: 500 });
    return HttpResponse.json(mockDistractions);
  }),
  http.get('*/analytics/daily', () => {
    if (shouldFail) return new HttpResponse(null, { status: 500 });
    return HttpResponse.json(mockDaily);
  }),
  http.get('*/analytics/summary', () => {
    if (shouldFail) return new HttpResponse(null, { status: 500 });
    return HttpResponse.json(mockSummary);
  }),
  http.get('*/analytics/insights', () => {
    if (shouldFail) return new HttpResponse(null, { status: 500 });
    return HttpResponse.json(mockInsights);
  }),
  http.get('*/analytics/predictions', () => {
    if (shouldFail) return new HttpResponse(null, { status: 500 });
    return HttpResponse.json(mockPredictions);
  }),
  http.post('*/analytics/simulate', () => {
    return HttpResponse.json({
      prediction: {
        attentionScore: 92,
        isDistracted: false,
        distractionProbability: 0.08,
        riskLevel: 'low',
        modelEngine: 'ml_model',
      },
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  currentWeekly = mockWeeklySummary;
  shouldFail = false;
});
afterAll(() => server.close());

function renderAnalyticsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AnalyticsPage />
    </QueryClientProvider>
  );
}

describe('AnalyticsPage', () => {
  it('renders all 5 main summary cards with readable values and labels', async () => {
    renderAnalyticsPage();

    await waitFor(() => {
      const kpiSection = screen.getByRole('region', { name: /key attention metrics/i });
      expect(kpiSection).toBeInTheDocument();
      expect(kpiSection).toHaveTextContent("Today's Focus Score");
    }, { timeout: 4000 });


    const kpiSection = screen.getByRole('region', { name: /key attention metrics/i });
    expect(kpiSection).toHaveTextContent("Today's Focus Score");
    expect(kpiSection).toHaveTextContent('78');
    expect(kpiSection).toHaveTextContent('Good Focus');
    expect(kpiSection).toHaveTextContent('Weekly Average');
    expect(kpiSection).toHaveTextContent('82');
    expect(kpiSection).toHaveTextContent("Today's Screen Time");
    expect(kpiSection).toHaveTextContent('2 hr 15 min');
    expect(kpiSection).toHaveTextContent('Distraction Count');
    expect(kpiSection).toHaveTextContent('Focus Sessions');
    expect(kpiSection).toHaveTextContent('2 completed');
  });

  it('renders weekly focus summary Monday through Sunday with Today highlighted', async () => {

    renderAnalyticsPage();

    await waitFor(() => {
      expect(
        screen.getByText(/Weekly Focus Summary \(Monday – Sunday\)/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('83')).toBeInTheDocument();
    });
  });

  it('handles empty activity gracefully without fabricating fake scores', async () => {
    currentWeekly = {
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

    renderAnalyticsPage();

    await waitFor(() => {
      expect(screen.getAllByText('No activity recorded yet').length).toBeGreaterThan(0);
    });
  });

  it('allows expanding and running the what-if simulation', async () => {
    const user = userEvent.setup();
    renderAnalyticsPage();

    await waitFor(() => {
      expect(screen.getByText(/What-If Focus Session Simulator/i)).toBeInTheDocument();
    });

    const toggle = screen.getByRole('button', { name: /What-If Focus Session Simulator/i });
    await user.click(toggle);

    expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Run Simulation/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Predicted Attention Score:/i)).toBeInTheDocument();
      expect(screen.getByText(/92 \/ 100/i)).toBeInTheDocument();
    });
  });
});
