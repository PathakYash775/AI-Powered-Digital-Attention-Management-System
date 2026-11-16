import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Spinner } from '../components/ui/Spinner';

export function AdminRoute({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Spinner label="Verifying administrator credentials..." size="lg" />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?role=admin&from=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (!isAdmin) {
    // Non-admin trying to access admin route - redirect to user dashboard
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

