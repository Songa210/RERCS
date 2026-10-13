// The responder's page: see assigned incidents and update their status.
import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

const ACTIVE_STATUSES = ['Assigned', 'In Progress', 'Pending'];

// The buttons a responder can use for each status
const NEXT_STEPS = {
  Assigned: [
    { label: '🚗 Start response', status: 'In Progress', style: 'btn-primary' },
  ],
  'In Progress': [
    { label: '⏸ Need more resources', status: 'Pending', style: 'btn-danger' },
    { label: '✅ Mark completed', status: 'Completed', style: 'btn-success' },
  ],
  Pending: [
    { label: '▶ Resume response', status: 'In Progress', style: 'btn-primary' },
  ],
};

// One incident shown as a card with its action buttons
function ResponderCard({ incident, onUpdate }) {
  const [note, setNote] = useState('');
  const steps = NEXT_STEPS[incident.status] || [];

  const handleClick = async (status) => {
    const ok = await onUpdate(incident.id, status, note);
    if (ok) setNote('');
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
        <strong>Citizen:</strong> {incident.citizen_name}
        {incident.citizen_phone && (
          <>
            {' '}
            – <a href={`tel:${incident.citizen_phone}`}>📞 {incident.citizen_phone}</a>
          </>
        )}
      </p>
      <p>
        <strong>Location:</strong> {incident.location}
        {incident.latitude && incident.longitude && (
          <>
            {' '}
            –{' '}
            <a
              href={`https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}#map=16/${incident.latitude}/${incident.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              📍 View on map
            </a>
          </>
        )}
      </p>
      <p>
        <strong>Description:</strong> {incident.description}
      </p>
      <p className="muted">
        Reported: {new Date(incident.reported_at).toLocaleString()}
      </p>

      {steps.length > 0 && (
        <>
          <label>Note for the dispatcher (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Example: Arrived at the scene"
          />

          <div className="actions">
            {steps.map((step) => (
              <button
                key={step.status}
                className={`btn ${step.style}`}
                onClick={() => handleClick(step.status)}
              >
                {step.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ResponderDashboard() {
  const [incidents, setIncidents] = useState([]);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadIncidents = useCallback(async () => {
    try {
      const response = await api.get('/incidents');
      setIncidents(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot reach the server');
    }
    setLoading(false);
  }, []);

  // Load now, then refresh every 10 seconds
  useEffect(() => {
    loadIncidents();
    const timer = setInterval(loadIncidents, 10000);
    return () => clearInterval(timer);
  }, [loadIncidents]);

  // Sends the new status to the backend. Returns true if it worked.
  const handleUpdate = async (id, status, note) => {
    setMessage('');
    setError('');
    try {
      await api.patch(`/incidents/${id}/status`, { status, note });
      setMessage(`✅ #${id} is now "${status}"`);
      await loadIncidents();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
      return false;
    }
  };

  const active = incidents.filter((i) => ACTIVE_STATUSES.includes(i.status));
  const history = incidents.filter((i) => !ACTIVE_STATUSES.includes(i.status));
  const shown = tab === 'active' ? active : history;

  return (
    <div className="container">
      <h2>Responder – My assignments</h2>

      <div className="filter-bar">
        <button
          className={`filter-btn ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          Active ({active.length})
        </button>
        <button
          className={`filter-btn ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          History ({history.length})
        </button>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}

      {!loading && shown.length === 0 && (
        <div className="card">
          <p>
            {tab === 'active'
              ? 'No active assignments right now.'
              : 'No completed incidents yet.'}
          </p>
        </div>
      )}

      {shown.map((incident) => (
        <ResponderCard
          key={incident.id}
          incident={incident}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
}

export default ResponderDashboard;