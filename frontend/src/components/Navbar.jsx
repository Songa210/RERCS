// The blue bar at the top of every page.
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        🚨 RERCS
      </Link>

      <div className="navbar-links">
        {user ? (
          <>
            {user.role === 'citizen' && (
              <>
                <Link to="/report">Report</Link>
                <Link to="/my-incidents">My incidents</Link>
              </>
            )}
            {user.role === 'dispatcher' && (
              <Link to="/dispatcher">Incidents</Link>
            )}
            {user.role === 'responder' && (
              <Link to="/responder">My assignments</Link>
            )}
            {user.role === 'admin' && <Link to="/admin">Admin</Link>}
            <span>
              {user.name} ({user.role})
            </span>
            <button className="navbar-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;