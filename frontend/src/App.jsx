import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import MentorRegister from './pages/MentorRegister';
import StudentDashboard from './pages/StudentDashboard';
import MentorDashboard from './pages/MentorDashboard';
import AdminPanel from './pages/AdminPanel';
import CourseViewer from './pages/CourseViewer';
import ChapterManagement from './pages/ChapterManagement';
import MentorCourseProgress from './pages/MentorCourseProgress';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';

const AppRoutes = () => {
  const { user, isAuthenticated, loading } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'student') return '/student/dashboard';
    if (user.role === 'mentor') return '/mentor/dashboard';
    if (user.role === 'admin') return '/admin/panel';
    return '/login';
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to={getDashboardPath()} replace />
            ) : (
              <LandingPage />
            )
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/mentor" element={<MentorRegister />} />
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mentor/dashboard"
          element={
            <ProtectedRoute allowedRoles={['mentor', 'admin']}>
              <MentorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/panel"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/course/:courseId"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <CourseViewer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/course/:courseId/manage"
          element={
            <ProtectedRoute allowedRoles={['mentor', 'admin']}>
              <ChapterManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mentor/course/:courseId/progress"
          element={
            <ProtectedRoute allowedRoles={['mentor', 'admin']}>
              <MentorCourseProgress />
            </ProtectedRoute>
          }
        />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}

export default App;
