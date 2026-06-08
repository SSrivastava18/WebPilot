import { useAuth } from '../Context/AuthContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function useAuthFetch() {
  const { token, logout } = useAuth();

  const authFetch = async (path, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    return res;
  };

  return authFetch;
}