import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import Loader from './Loader.jsx';

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAdminAuth();

  if (loading) return <Loader label="Checking your session..." />;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}
