// The dispatcher's main page: verify, assign and close incidents.
import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

const FILTERS = [
  'All',
  'Reported',
  'Verified',
  'Assigned',
  'In Progress',
  'Pending',
  'Completed',
  'Closed',
  'Rejected',
];

// Which responder types fit each emergency type
const SUGGESTED = {
  Fire: ['fire'],
  Medical: ['medical'],
  Crime: ['police'],
  Accident: ['police', 'medical'],
};

// One incident shown as a card with the buttons the dispatcher needs
function DispatcherCard({ incident, responders, onAction }) {
  const [responderId, setResponderId] = useState('');

  const suggested = SUGGESTED[incident.type] || [];

  // Put the suggested responder types first in the list
  const sortedResponders = [...responders].sort(
    (a, b) =>
      Number(suggested.includes(b.responder_type)) -
      Number(suggested.includes(a.responder_type))
  );

  return (
    <div className="card">
      <div className="incident-header">
        <h3 style={{ margin: 0 }}>
          #{incident.id} – {incident.type}
        </h3>
        <StatusBadge status={incident.status} />
      </div>

      <p>
        <strong>Reported by:</strong> {incident.citizen_name} (
        {incident.citizen_phone || 'no phone'})
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

      {incident.responder_name && (
        <p>
          <strong>Responder:</strong> {incident.responder_name} (
          {incident.responder_type})
        </p>
      )}

      {/* Buttons change depending on the status */}
      <div className="actions">
        {incident.status === 'Reported' && (
          <>
            <button
              className="btn btn-success"
              onClick={() =>
                onAction(incident.id, 'verify', { valid: true }, 'Incident verified')
              }
            >
              ✅ Verify
            </button>
            <button
              className="btn btn-danger"
              onClick={() =>
                onAction(incident.id, 'verify', { valid: false }, 'Report rejected')
              }
            >
              ❌ Reject (not a real emergency)
            </button>
          </>
        )}

        {incident.status === 'Verified' && (
          <>
            {responders.length === 0 ? (
              <span className="muted">No responder is available right now.</span>
            ) : (
              <>
                <select
                  value={responderId}
                  onChange={(e) => setResponderId(e.target.value)}
                >
                  <option value="">-- Choose a responder --</option>
                  {sortedResponders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {suggested.includes(r.responder_type) ? '⭐ ' : ''}
                      {r.name} – {r.responder_type}
                      {r.unit ? `, ${r.unit}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-primary"
                  disabled={!responderId}
                  onClick={() =>
                    onAction(
                      incident.id,
                      'assign',
                      { responder_id: Number(responderId) },
                      'Responder assigned'
                    )
                  }
                >
                  Assign responder
                </button>
              </>
            )}
          </>
        )}

        {incident.status === 'Completed' && (
          <button
            className="btn btn-success"
            onClick={() =>
              onAction(incident.id, 'close', {}, 'Incident closed')
            }
          >
            Close incident
          </button>
        )}
      </div>
    </div>
  );
}

function DispatcherDashboard() {
  const [incidents, setIncidents] = useState([]);
  const [responders, setResponders] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Loads incidents (with the chosen filter) and the available responders
  const loadData = useCallback(async () => {
    try {
      const params = filter === 'All' ? {} : { status: filter };
      const [incidentsResponse, respondersResponse] = await Promise.all([
        api.get('/incidents', { params }),
        api.get('/users/responders', { params: { status: 'available' } }),
      ]);
      setIncidents(incidentsResponse.data);
      setResponders(respondersResponse.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot reach the server');
    }
    setLoading(false);
  }, [filter]);

  // Load now, then refresh every 10 seconds
  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Runs a dispatcher action: verify, assign or close
  const handleAction = async (id, action, body, successMessage) => {
    setMessage('');
    setError('');
    try {
      await api.patch(`/incidents/${id}/${action}`, body);
      setMessage(`✅ #${id}: ${successMessage}`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="container">
      <h2>Dispatcher – Incidents</h2>

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}

      {!loading && incidents.length === 0 && (
        <div className="card">
          <p>No incidents found for this filter.</p>
        </div>
      )}

      {incidents.map((incident) => (
        <DispatcherCard
          key={incident.id}
          incident={incident}
          responders={responders}
          onAction={handleAction}
        />
      ))}
    </div>
  );
}

export default DispatcherDashboard;