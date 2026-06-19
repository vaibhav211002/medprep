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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <nav className="tab-rail mb-6">
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
      </div>
    </div>
  );
}
