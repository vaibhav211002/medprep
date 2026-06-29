import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function Navbar({ variant = 'student' }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-line bg-surface">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold text-pine-dark">MedPrep</span>
          <span className="font-mono text-xs text-slate uppercase tracking-wide">PYQ Bank</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {variant === 'student' ? (
            <>
              <Link to="/submit" className="text-slate hover:text-ink transition-colors">
                Submit a paper
              </Link>
              {/* <Link to="/admin/login" className="text-slate hover:text-ink transition-colors">
                Admin login
              </Link> */}
            </>
          ) : (
            <>
              {admin && <span className="text-slate hidden sm:inline">{admin.email}</span>}
              <Link to="/" className="text-slate hover:text-ink transition-colors">
                Student portal
              </Link>
              {admin && (
                <button
                  onClick={() => {
                    logout();
                    navigate('/admin/login');
                  }}
                  className="btn-secondary !px-3 !py-1.5"
                >
                  Log out
                </button>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
