import React from 'react';
import { Routes, Route } from 'react-router-dom';

import StudentHome from './pages/student/StudentHome.jsx';
import SubmitPaper from './pages/student/SubmitPaper.jsx';

import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import UploadPYQ from './pages/admin/UploadPYQ.jsx';
import ReviewQuestions from './pages/admin/ReviewQuestions.jsx';
import ManageSubjects from './pages/admin/ManageSubjects.jsx';
import Submissions from './pages/admin/Submissions.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      {/* Student portal */}
      <Route path="/" element={<StudentHome />} />
      <Route path="/submit" element={<SubmitPaper />} />

      {/* Admin portal */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="upload" element={<UploadPYQ />} />
        <Route path="review" element={<ReviewQuestions />} />
        <Route path="subjects" element={<ManageSubjects />} />
        <Route path="submissions" element={<Submissions />} />
      </Route>
    </Routes>
  );
}
