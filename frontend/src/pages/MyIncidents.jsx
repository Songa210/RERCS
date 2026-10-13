// The list of emergencies reported by the logged-in citizen.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

// One incident shown as a card
function IncidentCard({ incident }) {
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Show or hide the history of status changes
  const toggleHistory = async () => {
    if (history) {
      setHistory(null);
      return;
    }
    setLoadingHistory(true);
    try {
      const response = await api.get(`/incidents/${incident.id}/history`);
      setHistory(response.data);
    } catch (err) {
      setHistory([]);
    }
    setLoadingHistory(false);
  };

  return (
    <div className="card">
      <div className="incident-header">
        <h3 style={{ margin: 0 }}>
          #{incident.id} – {incident.type}
        </h3>
        <StatusBadge status={incident.status} />
      </div>

      <p>
        <strong>Location:</strong> {incident.location}
      </p>
      <p>
        <strong>Description:</strong> {incident.description}
      </p>
      <p className="muted">
        Reported: {new Date(incident.reported_at).toLocaleString()}
      </p>

      {incident.responder_name && (
        <p>
          <strong>Responder:</strong> {incident.responder_name} (
          {incident.responder_type})
        </p>
      )}

      <button className="btn btn-primary" onClick={toggleHistory}>
        {loadingHistory ? 'Loading...' : history ? 'Hide history' : 'Show history'}
      </button>

      {history && (
        <ul className="history-list">
          {history.map((h) => (
            <li key={h.id}>
              <strong>{h.status}</strong> – {h.note} (
              {new Date(h.created_at).toLocaleString()})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MyIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadIncidents = async () => {
      try {
        const response = await api.get('/incidents');
        setIncidents(response.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Cannot reach the server');
      }
      setLoading(false);
    };

    loadIncidents();
    // Refresh the list every 10 seconds to see new status updates
    const timer = setInterval(loadIncidents, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="container">
      <h2>My incidents</h2>

      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && incidents.length === 0 && (
        <div className="card">
          <p>You have not reported any emergency yet.</p>
          <Link to="/report">
            <button className="btn btn-danger">🚨 Report an emergency</button>
          </Link>
        </div>
      )}

      {incidents.map((incident) => (
        <IncidentCard key={incident.id} incident={incident} />
      ))}
    </div>
  );
}

export default MyIncidents;