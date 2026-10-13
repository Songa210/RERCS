// Remembers WHO is logged in and shares it with every page.
import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // When the page loads, read the saved user from the browser (stay logged in)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const saveSession = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    saveSession(response.data);
  };

  const register = async (formData) => {
    const response = await api.post('/auth/register', formData);
    saveSession(response.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Any page can call useAuth() to get { user, login, register, logout }
export function useAuth() {
  return useContext(AuthContext);
}