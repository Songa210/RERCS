// Guards a page: only logged-in users (and optionally only certain roles) can enter.
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  // Not logged in -> go to the login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role -> go back to the dashboard
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;