import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';

const links = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/upload', label: 'Upload PYQs' },
  { to: '/admin/review', label: 'Review queue' },
  { to: '/admin/subjects', label: 'Subjects & topics' },
  { to: '/admin/submissions', label: 'Student submissions' },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen">
      <Navbar variant="admin" />
      <main className="page-container py-6 sm:py-9">
        <nav className="tab-rail mb-8" aria-label="Admin navigation">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `tab-item ${isActive ? 'is-active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </main>
    </div>
  );
}
