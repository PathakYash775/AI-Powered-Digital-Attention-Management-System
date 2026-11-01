import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { Spinner } from '../components/ui/Spinner';

const LoginPage = lazy(() =>
  import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('../features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const DashboardPage = lazy(() =>
  import('../features/activity/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ActivityPage = lazy(() =>
  import('../features/activity/ActivityPage').then((m) => ({ default: m.ActivityPage })),
);
const FocusPage = lazy(() =>
  import('../features/focus/FocusPage').then((m) => ({ default: m.FocusPage })),
);
const GoalsPage = lazy(() =>
  import('../features/goals/GoalsPage').then((m) => ({ default: m.GoalsPage })),
);
const ProfilePage = lazy(() =>
  import('../features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const AnalyticsPage = lazy(() =>
  import('../features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner label="Loading page..." size="lg" />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/focus" element={<FocusPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
