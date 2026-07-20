import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Component, type ReactNode } from 'react';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace' }}>
          <h2 style={{ color: 'red' }}>Erreur de rendu</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#fee2e2', padding: 16, borderRadius: 8 }}>
            {(this.state.error as Error).message}
            {'\n\n'}
            {(this.state.error as Error).stack}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '8px 16px' }}>
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import RegisterPage from './pages/RegisterPage';
import BackofficeDashboard from './backoffice/BackofficeDashboard';
import BackofficeMembers from './backoffice/BackofficeMembers';
import BackofficeElections from './backoffice/BackofficeElections';
import BackofficeCandidatures from './backoffice/BackofficeCandidatures';
import BackofficeAudit from './backoffice/BackofficeAudit';
import BackofficeConditions from './backoffice/BackofficeConditions';
import BackofficeParametres from './backoffice/BackofficeParametres';
import DashboardPage from './pages/DashboardPage';
import VotePage from './pages/VotePage';
import VoteDetailPage from './pages/VoteDetailPage';
import LiveResultsPage from './pages/LiveResultsPage';
import CandidaturesPage from './pages/CandidaturesPage';
import ProfilPage from './pages/ProfilPage';
import AdminMembresPage from './pages/AdminMembresPage';
import AdminElectionsPage from './pages/AdminElectionsPage';
import AdminCandidaturesPage from './pages/AdminCandidaturesPage';
import AuditPage from './pages/AuditPage';
import ElectionResultsPage from './pages/ElectionResultsPage';
import PlatformOrganizations from './platform/PlatformOrganizations';

function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="text-ink-400">Chargement…</span>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!['ADMIN', 'COMMISSION', 'OBSERVATEUR'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function BackofficeRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PlatformRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vote"
        element={
          <ProtectedRoute>
            <VotePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vote/:electionId"
        element={
          <ProtectedRoute>
            <VoteDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vote/:electionId/live"
        element={
          <ProtectedRoute>
            <LiveResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vote/:electionId/results"
        element={
          <ProtectedRoute>
            <ElectionResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidatures"
        element={
          <ProtectedRoute>
            <CandidaturesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profil"
        element={
          <ProtectedRoute>
            <ProfilPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/membres"
        element={
          <AdminRoute>
            <AdminMembresPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/scrutins"
        element={
          <AdminRoute>
            <AdminElectionsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/candidatures"
        element={
          <AdminRoute>
            <AdminCandidaturesPage />
          </AdminRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <AdminRoute>
            <AuditPage />
          </AdminRoute>
        }
      />

      {/* Backoffice — ADMIN only */}
      <Route path="/backoffice" element={<BackofficeRoute><BackofficeDashboard /></BackofficeRoute>} />
      <Route path="/backoffice/membres" element={<BackofficeRoute><BackofficeMembers /></BackofficeRoute>} />
      <Route path="/backoffice/scrutins" element={<BackofficeRoute><BackofficeElections /></BackofficeRoute>} />
      <Route path="/backoffice/candidatures" element={<BackofficeRoute><BackofficeCandidatures /></BackofficeRoute>} />
      <Route path="/backoffice/audit" element={<BackofficeRoute><BackofficeAudit /></BackofficeRoute>} />
      <Route path="/backoffice/conditions" element={<BackofficeRoute><BackofficeConditions /></BackofficeRoute>} />
      <Route path="/backoffice/parametres" element={<BackofficeRoute><BackofficeParametres /></BackofficeRoute>} />

      {/* Plateforme — SUPER_ADMIN only */}
      <Route path="/platform" element={<PlatformRoute><PlatformOrganizations /></PlatformRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
