// The ONE place where React talks to the backend.
import axios from 'axios';

export const API_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Before every request, add the login token (if the user is logged in)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
