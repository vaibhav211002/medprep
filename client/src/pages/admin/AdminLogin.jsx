import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="border-b border-line bg-white">
        <div className="page-container flex h-16 items-center">
          <a href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pine text-sm font-bold text-white">M</span>
            <span className="font-display text-lg font-semibold text-pine-dark">MedPrep</span>
          </a>
        </div>
      </header>
      <main className="page-container grid min-h-[calc(100vh-4rem)] items-center gap-10 py-10 lg:grid-cols-2">
        <div className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">Administration</p>
          <h1 className="mt-3 max-w-lg font-display text-5xl font-semibold leading-tight text-pine-dark">
            Manage your medical question bank.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate">
            Review extracted questions, organize subjects, and publish trusted study material.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="card mx-auto w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine mb-2">Secure workspace</p>
        <h2 className="font-display text-3xl font-semibold text-ink">Admin sign in</h2>
        <p className="text-sm text-slate mt-2 mb-6">Use your administrator account to continue.</p>

        <label className="field-label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          className="field-input mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />

        <label className="field-label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          className="field-input mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full mt-2">
          {busy ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-xs text-slate mt-4">
          No account yet? Run <code className="font-mono">npm run seed:admin</code> in the
          server folder using the credentials from your <code className="font-mono">.env</code>.
        </p>
      </form>
      </main>
    </div>
  );
}
