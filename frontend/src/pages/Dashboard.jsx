// The page shown after login. Each role gets buttons to its own pages.
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="container">
      <div className="card">
        <h2>Welcome, {user.name} 👋</h2>
        <p>
          You are logged in as <strong>{user.role}</strong>.
        </p>

        {user.role === 'citizen' && (
          <>
            <Link to="/report">
              <button className="btn btn-danger">🚨 Report an emergency</button>
            </Link>{' '}
            <Link to="/my-incidents">
              <button className="btn btn-primary">My incidents</button>
            </Link>
          </>
        )}

        {user.role === 'dispatcher' && (
          <Link to="/dispatcher">
            <button className="btn btn-primary">Manage incidents</button>
          </Link>
        )}

        {user.role === 'responder' && (
          <Link to="/responder">
            <button className="btn btn-primary">My assignments</button>
          </Link>
        )}

        {user.role === 'admin' && (
          <Link to="/admin">
            <button className="btn btn-primary">Open admin panel</button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default Dashboard;