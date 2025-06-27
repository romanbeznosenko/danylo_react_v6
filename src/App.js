// App.js - Corrected with proper imports
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import DatabaseTiresPage from './pages/DatabaseTiresPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPanel from './components/AdminPanel';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Routes with header */}
            <Route path="/*" element={<AppWithHeader />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Component that includes header for authenticated routes
function AppWithHeader() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          {/* Dashboard - accessible to all authenticated users */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireApproval={false}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Pending approval page */}
          <Route
            path="/pending-approval"
            element={
              <ProtectedRoute requireApproval={false}>
                <PendingApprovalPage />
              </ProtectedRoute>
            }
          />

          {/* Home page (scraper) - accessible to all approved users including guests */}
          <Route
            path="/"
            element={
              <ProtectedRoute
                requiredRoles={['guest', 'user', 'admin']}
                requireApproval={true}
              >
                <HomePage />
              </ProtectedRoute>
            }
          />

          {/* Database page - requires user or admin role and approval */}
          <Route
            path="/database"
            element={
              <ProtectedRoute
                requiredRoles={['user', 'admin']}
                requireApproval={true}
              >
                <DatabaseTiresPage />
              </ProtectedRoute>
            }
          />

          {/* Admin panel - requires admin role */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute
                requiredRoles={['admin']}
                requireApproval={true}
              >
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* Redirect root to appropriate page */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default App;