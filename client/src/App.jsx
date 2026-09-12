import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import HomePage from './pages/home/HomePage';
import JoinPage from './pages/student/JoinPage';
import PlayerGame from './pages/student/PlayerGame';
import PublicDisplay from './pages/display/PublicDisplay';
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import EventWizardPage from './pages/admin/EventWizardPage';
import LiveControlDesk from './pages/admin/LiveControlDesk';
import ResultsPage from './pages/admin/ResultsPage';

// Protected Route Wrapper for Admin Pages
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-eesa-bg text-eesa-text flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Home & Registration Experience */}
          <Route path="/" element={<HomePage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/:eventCode" element={<JoinPage />} />
          <Route path="/play/:eventCode" element={<PlayerGame />} />

          {/* Public Projector Display (No Auth Required) */}
          <Route path="/display/:eventCode" element={<PublicDisplay />} />

          {/* Admin / Host Authentication */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Admin Experience */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events/new"
            element={
              <ProtectedRoute>
                <EventWizardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events/:eventId/live"
            element={
              <ProtectedRoute>
                <LiveControlDesk />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events/:eventId/results"
            element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/join" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
