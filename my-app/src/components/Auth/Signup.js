import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import './Auth.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // ── Email/password register ───────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 6)       return setError('Password must be at least 6 characters.');

    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Google signup (same endpoint as login — upserts user) ──
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/auth/google`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Google sign-up failed');
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">✈</span>
          <span className="auth-logo-text">WebPilot</span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start piloting the web</p>

        {error && <div className="auth-error">{error}</div>}

        {/* Google button */}
        <div className="google-btn-wrap">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-up failed. Please try again.')}
            width="100%"
            theme="filled_black"
            shape="rectangular"
            text="signup_with"
          />
        </div>

        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="name">Name</label>
            <input
              id="name" name="name" type="text"
              autoComplete="name" required
              value={form.name} onChange={handleChange}
              placeholder="Your name"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              autoComplete="email" required
              value={form.email} onChange={handleChange}
              placeholder="you@example.com"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password"
              autoComplete="new-password" required
              value={form.password} onChange={handleChange}
              placeholder="Min. 6 characters"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirm">Confirm password</label>
            <input
              id="confirm" name="confirm" type="password"
              autoComplete="new-password" required
              value={form.confirm} onChange={handleChange}
              placeholder="Repeat password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}