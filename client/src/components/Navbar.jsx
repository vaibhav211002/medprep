import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function Navbar({ variant = 'student' }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const studentLinks = [
    { to: '/', label: 'Home', end: true },
    { to: '/#subjects', label: 'Subjects' },
    { to: '/submit', label: 'Submit a paper' },
    { to: '/#about', label: 'About' },
  ];

  function linkClass({ isActive }) {
    return 'nav-link ' + (isActive ? 'nav-link-active' : '');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="page-container flex h-[68px] items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="MedPrep home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine text-sm font-bold text-white">M</span>
          <span>
            <span className="block font-display text-lg font-semibold leading-tight text-pine-dark">MedPrep</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-slate">Medical question bank</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {variant === 'student' ? (
            <>
              <NavLink to="/" end className={linkClass}>Home</NavLink>
              <a className="nav-link" href="/#subjects">Subjects</a>
              <NavLink to="/submit" className={linkClass}>Submit a paper</NavLink>
              <a className="nav-link" href="/#about">About</a>
            </>
          ) : (
            <>
              {admin && <span className="mr-2 max-w-48 truncate text-sm text-slate">{admin.email}</span>}
              <Link to="/" className="nav-link">Student portal</Link>
              {admin && (
                <button
                  onClick={() => { logout(); navigate('/admin/login'); }}
                  className="btn-secondary !px-3 !py-2"
                >
                  Log out
                </button>
              )}
            </>
          )}
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-pine-dark md:hidden"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="text-xl leading-none" aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-line bg-white px-4 py-3 md:hidden" aria-label="Mobile navigation">
          {variant === 'student' ? (
            <div className="flex flex-col gap-1">
              <NavLink to="/" end className={linkClass} onClick={() => setMenuOpen(false)}>Home</NavLink>
              <a className="nav-link" href="/#subjects" onClick={() => setMenuOpen(false)}>Subjects</a>
              <NavLink to="/submit" className={linkClass} onClick={() => setMenuOpen(false)}>Submit a paper</NavLink>
              <a className="nav-link" href="/#about" onClick={() => setMenuOpen(false)}>About</a>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {admin && <span className="px-3 py-2 text-sm text-slate">{admin.email}</span>}
              <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>Student portal</Link>
              {admin && (
                <button onClick={() => { logout(); navigate('/admin/login'); setMenuOpen(false); }} className="btn-secondary">
                  Log out
                </button>
              )}
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
