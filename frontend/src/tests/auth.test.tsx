import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import '@testing-library/jest-dom/vitest';
import { AuthProvider } from '../features/auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ProtectedRoute } from '../app/ProtectedRoute';
import { setAccessToken } from '../api/client';

const server = setupServer(
  http.post('*/auth/refresh', () => {
    return HttpResponse.json({ accessToken: 'valid-restored-token' });
  }),
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email === 'user@example.com' && body.password === 'ValidPass123!') {
      return HttpResponse.json({
        accessToken: 'login-token',
        user: { id: 'user-1', email: 'user@example.com' },
      });
    }
    return HttpResponse.json(
      { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } },
      { status: 401 },
    );
  }),
);

describe('Auth Feature', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  beforeEach(() => {
    setAccessToken(null);
  });

  afterEach(() => {
    server.resetHandlers();
    setAccessToken(null);
  });

  afterAll(() => {
    server.close();
  });

  it('register validation shows field errors for invalid input', async () => {
    server.use(
      http.post('*/auth/refresh', () => {
        return HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'No token' } },
          { status: 401 },
        );
      }),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: /^Register$/i });

    await user.type(emailInput, 'not-an-email');
    await user.type(passwordInput, 'short');
    await user.click(submitBtn);

    expect(await screen.findByText(/Invalid email address/i)).toBeInTheDocument();
    expect(await screen.findByText(/Password must be at least 10 characters/i)).toBeInTheDocument();
  });

  it('login success authenticates user', async () => {
    server.use(
      http.post('*/auth/refresh', () => {
        return HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'No token' } },
          { status: 401 },
        );
      }),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Dashboard Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'ValidPass123!');
    await user.click(screen.getByRole('button', { name: /^Log in$/i }));

    expect(await screen.findByText('Dashboard Home')).toBeInTheDocument();
  });

  it('login failure shows the generic message', async () => {
    server.use(
      http.post('*/auth/refresh', () => {
        return HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'No token' } },
          { status: 401 },
        );
      }),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'WrongPassword123!');
    await user.click(screen.getByRole('button', { name: /^Log in$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('session restored on load via refresh', async () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content Loaded</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Protected Content Loaded')).toBeInTheDocument();
  });
});
