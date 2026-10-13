// The form where a citizen reports an emergency.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const TYPES = ['Fire', 'Medical', 'Accident', 'Crime', 'Natural Disaster', 'Other'];

function ReportEmergency() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: 'Fire',
    location: '',
    description: '',
  });
  const [coords, setCoords] = useState(null);
  const [gpsMessage, setGpsMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Asks the browser for the phone/computer GPS position
  const getMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsMessage('Your browser does not support GPS');
      return;
    }
    setGpsMessage('Getting your location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGpsMessage('✅ GPS location captured');
      },
      () => setGpsMessage('❌ Could not get your location. Please type it below.')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/incidents', {
        ...form,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      navigate('/my-incidents'); // show the list after sending
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot reach the server');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="card">
        <h2>🚨 Report an emergency</h2>

        <form onSubmit={handleSubmit}>
          <label>Type of emergency</label>
          <select name="type" value={form.type} onChange={handleChange}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <label>Location (village, street, landmark)</label>
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Example: Kimironko, near the market"
            required
          />

          <button type="button" className="btn btn-primary" onClick={getMyLocation}>
            📍 Use my GPS location
          </button>
          {gpsMessage && <p className="muted">{gpsMessage}</p>}

          <label>Describe what is happening</label>
          <textarea
            name="description"
            rows="4"
            value={form.description}
            onChange={handleChange}
            placeholder="Example: A house is on fire, two people are inside"
            required
          />

          {error && <p className="error">{error}</p>}

          <button className="btn btn-danger" type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send emergency report'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ReportEmergency;