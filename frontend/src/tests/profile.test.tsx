import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom/vitest';
import { ProfilePage } from '../features/profile/ProfilePage';
import { POPULAR_TIMEZONES, getTimezoneGroups, getBrowserTimezone } from '../lib/timezones';
import type { Profile } from '../api/types';

// Mock useAuth
vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-demo-1', email: 'yashpathak086@gmail.com' },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

let currentProfile: Profile = {
  displayName: 'Yash Pathak',
  timezone: 'Asia/Kolkata',
  occupationType: 'professional',
  workStart: '09:00',
  workEnd: '17:00',
};

const server = setupServer(
  http.get('*/profile', () => {
    return HttpResponse.json(currentProfile);
  }),
  http.patch('*/profile', async ({ request }) => {
    const body = (await request.json()) as Partial<Profile>;
    currentProfile = { ...currentProfile, ...body };
    return HttpResponse.json(currentProfile);
  }),
  http.get('*/devices', () => {
    return HttpResponse.json([]);
  }),
);

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Profile & Timezone Management', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  beforeEach(() => {
    currentProfile = {
      displayName: 'Yash Pathak',
      timezone: 'Asia/Kolkata',
      occupationType: 'professional',
      workStart: '09:00',
      workEnd: '17:00',
    };
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('timezones library includes Indian timezones and groups', () => {
    const kolkata = POPULAR_TIMEZONES.find((t) => t.value === 'Asia/Kolkata');
    expect(kolkata).toBeDefined();
    expect(kolkata?.label).toContain('India Standard Time');

    const calcutta = POPULAR_TIMEZONES.find((t) => t.value === 'Asia/Calcutta');
    expect(calcutta).toBeDefined();

    const groups = getTimezoneGroups();
    expect(groups.length).toBeGreaterThan(0);
    const popularGroup = groups.find((g) => g.label.includes('Popular & India'));
    expect(popularGroup).toBeDefined();
    expect(popularGroup?.options.some((o) => o.value === 'Asia/Kolkata')).toBe(true);
  });

  it('renders profile page with Yash Pathak and Asia/Kolkata timezone', async () => {
    renderWithClient(<ProfilePage />);

    expect(await screen.findByDisplayValue('Yash Pathak')).toBeInTheDocument();

    const tzSelect = screen.getByLabelText(/timezone/i) as HTMLSelectElement;
    expect(tzSelect).toBeInTheDocument();
    expect(tzSelect.value).toBe('Asia/Kolkata');

    // Confirm Asia/Kolkata option is present in the document
    const kolkataOption = screen.getByRole('option', { name: /Asia\/Kolkata — India Standard Time/i });
    expect(kolkataOption).toBeInTheDocument();
  });

  it('allows changing timezone and saving profile successfully', async () => {
    const user = userEvent.setup();
    renderWithClient(<ProfilePage />);

    await screen.findByDisplayValue('Yash Pathak');

    const tzSelect = screen.getByLabelText(/timezone/i);
    await user.selectOptions(tzSelect, 'Asia/Dubai');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    expect(await screen.findByText(/profile updated successfully/i)).toBeInTheDocument();
    expect(currentProfile.timezone).toBe('Asia/Dubai');
  });

  it('clicking detect local timezone button sets local timezone', async () => {
    const user = userEvent.setup();
    renderWithClient(<ProfilePage />);

    await screen.findByDisplayValue('Yash Pathak');

    const detectBtn = screen.getByRole('button', { name: /detect local timezone/i });
    expect(detectBtn).toBeInTheDocument();

    await user.click(detectBtn);

    const tzSelect = screen.getByLabelText(/timezone/i) as HTMLSelectElement;
    expect(tzSelect.value).toBe(getBrowserTimezone());
  });
});
