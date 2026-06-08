import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('wp_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wp_user'));
    } catch {
      return null;
    }
  });

  const login = useCallback((token, user) => {
    localStorage.setItem('wp_token', token);
    localStorage.setItem('wp_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wp_token');
    localStorage.removeItem('wp_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}