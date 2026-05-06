import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DirectorDashboard from './pages/DirectorDashboard';
import RebalancerDashboard from './pages/RebalancerDashboard';
import DistributePage from './pages/DistributePage';
import ProspectFormPage from './pages/ProspectFormPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AgentsPage from './pages/AgentsPage';
import ReportsPage from './pages/ReportsPage';
import TargetsPage from './pages/TargetsPage';
import UsersPage from './pages/UsersPage';
import MyProspectsPage from './pages/MyProspectsPage';
import './index.css';

function PrivateRoute({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to={user.role === 'REBALANCER' ? '/rebalancer' : '/director'} replace />;
  return <Layout>{children}</Layout>;
}

function App() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={user?.role === 'REBALANCER' ? '/rebalancer' : '/director'} replace /> : <LoginPage />} />
      <Route path="/director" element={<PrivateRoute roles={['DIRECTOR', 'ADMIN', 'SUPERVISOR']}><DirectorDashboard /></PrivateRoute>} />
      <Route path="/rebalancer" element={<PrivateRoute roles={['REBALANCER']}><RebalancerDashboard /></PrivateRoute>} />
      <Route path="/distribute" element={<PrivateRoute roles={['REBALANCER']}><DistributePage /></PrivateRoute>} />
      <Route path="/prospects/new" element={<PrivateRoute roles={['REBALANCER']}><ProspectFormPage /></PrivateRoute>} />
      <Route path="/my-prospects" element={<PrivateRoute roles={['REBALANCER']}><MyProspectsPage /></PrivateRoute>} />
      <Route path="/leaderboard" element={<PrivateRoute><LeaderboardPage /></PrivateRoute>} />
      <Route path="/agents" element={<PrivateRoute roles={['DIRECTOR', 'ADMIN', 'SUPERVISOR']}><AgentsPage /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute roles={['DIRECTOR', 'ADMIN']}><ReportsPage /></PrivateRoute>} />
      <Route path="/targets" element={<PrivateRoute roles={['DIRECTOR', 'ADMIN']}><TargetsPage /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute roles={['DIRECTOR', 'ADMIN']}><UsersPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to={isAuthenticated ? (user?.role === 'REBALANCER' ? '/rebalancer' : '/director') : '/login'} replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <HashRouter>
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <App />
      </HashRouter>
    </AuthProvider>
  </React.StrictMode>
);
