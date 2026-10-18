import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom/vitest';
import { goalSchema } from '../features/goals/schemas';
import { GoalsPage } from '../features/goals/GoalsPage';
import type { Goal } from '../api/types';

let mockGoals: Goal[] = [];

const server = setupServer(
  http.get('*/goals', () => {
    return HttpResponse.json(mockGoals);
  }),
  http.post('*/goals', async ({ request }) => {
    const body = (await request.json()) as Omit<Goal, 'id'>;
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      ...body,
    };
    mockGoals.push(newGoal);
    return HttpResponse.json(newGoal, { status: 201 });
  }),
  http.delete('*/goals/:id', ({ params }) => {
    mockGoals = mockGoals.filter((g) => g.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
);

describe('Goals Feature', () => {
  beforeAll(() => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open');
      };
    }
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  beforeEach(() => {
    mockGoals = [];
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('zod bounds enforce min 1, max 10080, and integer', () => {
    const validMin = goalSchema.safeParse({
      type: 'focus_minutes',
      period: 'daily',
      targetValue: 1,
    });
    expect(validMin.success).toBe(true);

    const validMax = goalSchema.safeParse({
      type: 'max_screen_minutes',
      period: 'weekly',
      targetValue: 10080,
    });
    expect(validMax.success).toBe(true);

    const invalidUnder = goalSchema.safeParse({
      type: 'focus_minutes',
      period: 'daily',
      targetValue: 0,
    });
    expect(invalidUnder.success).toBe(false);

    const invalidOver = goalSchema.safeParse({
      type: 'focus_minutes',
      period: 'daily',
      targetValue: 10081,
    });
    expect(invalidOver.success).toBe(false);

    const invalidFloat = goalSchema.safeParse({
      type: 'focus_minutes',
      period: 'daily',
      targetValue: 10.5,
    });
    expect(invalidFloat.success).toBe(false);
  });

  it('create then delete flow creates goal and removes it upon confirm', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <GoalsPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/No goals configured yet/i)).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /Add your first goal/i });
    await user.click(addBtn);

    const targetInput = screen.getByLabelText(/Target Value/i);
    await user.clear(targetInput);
    await user.type(targetInput, '150');

    const submitBtn = screen.getByRole('button', { name: /^Create Goal$/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/Target: 150/i)).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    await user.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: /^Confirm Delete$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Target: 150/i)).not.toBeInTheDocument();
    });
  });
});
