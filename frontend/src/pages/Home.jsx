// Temporary home page: it only checks that React can reach the backend.
import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../services/api';

function Home() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    axios
      .get(API_URL)
      .then(() => setStatus('connected'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h1>RERCS</h1>
        <p>Rwanda Emergency Response and Coordination System</p>

        {status === 'checking' && <p>Checking the server...</p>}
        {status === 'connected' && (
          <p className="ok">✅ Frontend is connected to the backend</p>
        )}
        {status === 'error' && (
          <p className="fail">
            ❌ Cannot reach the backend. Is it running on {API_URL}?
          </p>
        )}
      </div>
    </div>
  );
}

export default Home;
