import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
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
const DevicesPage = lazy(() =>
  import('../features/devices/DevicesPage').then((m) => ({ default: m.DevicesPage })),
);
const AnalyticsPage = lazy(() =>
  import('../features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);
const TasksPage = lazy(() =>
  import('../features/tasks/TasksPage').then((m) => ({ default: m.TasksPage })),
);
const RecommendationsPage = lazy(() =>
  import('../features/recommendations/RecommendationsPage').then((m) => ({ default: m.RecommendationsPage })),
);
const HistoryPage = lazy(() =>
  import('../features/history/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);
const NotificationsPage = lazy(() =>
  import('../features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);

const AdminLayout = lazy(() =>
  import('../features/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdminOverviewPage = lazy(() =>
  import('../features/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })),
);
const AdminUsersPage = lazy(() =>
  import('../features/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);
const AdminCategoriesPage = lazy(() =>
  import('../features/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })),
);
const AdminSystemPage = lazy(() =>
  import('../features/admin/AdminSystemPage').then((m) => ({ default: m.AdminSystemPage })),
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
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/system" element={<AdminSystemPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
