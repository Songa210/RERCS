// The admin's page: overview, users list, and creating new users.
import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUSES = [
  'Reported',
  'Verified',
  'Assigned',
  'In Progress',
  'Pending',
  'Completed',
  'Closed',
  'Rejected',
];

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'dispatcher',
  responder_type: 'police',
  unit: '',
  extra: '', // badge number, license number or station (depends on the type)
};

// ---------- TAB 1: Overview (reports) ----------
function Overview() {
  const [incidents, setIncidents] = useState([]);
  const [responders, setResponders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/incidents'), api.get('/users/responders')])
      .then(([incidentsResponse, respondersResponse]) => {
        setIncidents(incidentsResponse.data);
        setResponders(respondersResponse.data);
      })
      .catch((err) =>
        setError(err.response?.data?.message || 'Cannot reach the server')
      );
  }, []);

  // Count how many incidents have each status
  const count = (status) => incidents.filter((i) => i.status === status).length;

  return (
    <>
      {error && <p className="error">{error}</p>}

      <div className="stats">
        <div className="stat-box">
          <div className="stat-number">{incidents.length}</div>
          <div>Total incidents</div>
        </div>
        {STATUSES.map((s) => (
          <div className="stat-box" key={s}>
            <div className="stat-number">{count(s)}</div>
            <div>{s}</div>
          </div>
        ))}
      </div>

      <div className="card table-wrap">
        <h3>Responders</h3>
        {responders.length === 0 ? (
          <p>No responders yet. Create one in the "Create user" tab.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {responders.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.responder_type}</td>
                  <td>{r.unit || '-'}</td>
                  <td>{r.status === 'available' ? '🟢 available' : '🔴 ' + r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ---------- TAB 2: Users list ----------
function UsersTab() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot reach the server');
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete ${u.name}?`)) return;
    setMessage('');
    setError('');
    try {
      await api.delete(`/users/${u.id}`);
      setMessage(`✅ ${u.name} was deleted`);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.phone || '-'}</td>
                <td>{u.role}</td>
                <td>
                  {u.id !== me.id && (
                    <button
                      className="btn btn-danger"
                      style={{ marginTop: 0, padding: '5px 12px' }}
                      onClick={() => handleDelete(u)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------- TAB 3: Create user ----------
function CreateUserTab() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // The extra field changes name depending on the responder type
  const extraLabel = {
    police: 'Badge number',
    medical: 'License number',
    fire: 'Fire station',
  }[form.responder_type];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const body = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      role: form.role,
    };

    if (form.role === 'responder') {
      body.responder_type = form.responder_type;
      body.unit = form.unit;
      if (form.responder_type === 'police') body.badge_number = form.extra;
      if (form.responder_type === 'medical') body.license_number = form.extra;
      if (form.responder_type === 'fire') body.station = form.extra;
    }

    try {
      await api.post('/users', body);
      setMessage(`✅ ${form.role} account created for ${form.name}`);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot reach the server');
    }
    setLoading(false);
  };

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h3>Create a new user</h3>

      <form onSubmit={handleSubmit}>
        <label>Role</label>
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="dispatcher">Dispatcher</option>
          <option value="responder">Emergency responder</option>
          <option value="admin">Administrator</option>
        </select>

        <label>Full name</label>
        <input name="name" value={form.name} onChange={handleChange} required />

        <label>Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label>Phone</label>
        <input name="phone" value={form.phone} onChange={handleChange} />

        <label>Password (at least 6 characters)</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
        />

        {form.role === 'responder' && (
          <>
            <label>Responder type</label>
            <select
              name="responder_type"
              value={form.responder_type}
              onChange={handleChange}
            >
              <option value="police">Police</option>
              <option value="medical">Medical</option>
              <option value="fire">Fire</option>
            </select>

            <label>Unit (example: Kigali Police Unit 2)</label>
            <input name="unit" value={form.unit} onChange={handleChange} />

            <label>{extraLabel}</label>
            <input name="extra" value={form.extra} onChange={handleChange} />
          </>
        )}

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create user'}
        </button>
      </form>
    </div>
  );
}

// ---------- The page itself ----------
function AdminDashboard() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="container">
      <h2>Administrator</h2>

      <div className="filter-bar">
        <button
          className={`filter-btn ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          className={`filter-btn ${tab === 'users' ? 'active' : ''}`}
          onClick={() => setTab('users')}
        >
          Users
        </button>
        <button
          className={`filter-btn ${tab === 'create' ? 'active' : ''}`}
          onClick={() => setTab('create')}
        >
          Create user
        </button>
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'users' && <UsersTab />}
      {tab === 'create' && <CreateUserTab />}
    </div>
  );
}

export default AdminDashboard;