import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';

// Komponenten importieren
import Login from './components/Login';
import TeamDashboard from './components/TeamDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import TeamManagement from './components/admin/TeamManagement';
import RaspberryManagement from './components/admin/RaspberryManagement';
import AssignmentManagement from './components/admin/AssignmentManagement';
import TeamChart from './components/admin/TeamChart';

// PrivateRoute Komponente für geschützte Routen
const PrivateRoute = ({ element, requiresAdmin = false }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  // Wenn noch geladen wird, nichts anzeigen
  if (loading) {
    return null;
  }
  
  // Wenn nicht authentifiziert, zur Login-Seite umleiten
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Wenn Admin-Rechte erforderlich sind, aber der Benutzer kein Admin ist
  if (requiresAdmin && !user?.is_admin) {
    return <Navigate to="/dashboard" />;
  }
  
  // Andernfalls geschützte Route rendern
  return element;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Öffentliche Routen */}
      <Route path="/login" element={<Login />} />
      
      {/* Geschützte Routen für alle authentifizierten Benutzer */}
      <Route 
        path="/dashboard" 
        element={<PrivateRoute element={<TeamDashboard />} />} 
      />
      
      {/* Admin-Routen */}
      <Route 
        path="/admin" 
        element={<PrivateRoute element={<AdminDashboard />} requiresAdmin />} 
      />
      <Route 
        path="/admin/teams" 
        element={<PrivateRoute element={<TeamManagement />} requiresAdmin />} 
      />
      <Route 
        path="/admin/raspberry" 
        element={<PrivateRoute element={<RaspberryManagement />} requiresAdmin />} 
      />
      <Route 
        path="/admin/assignments" 
        element={<PrivateRoute element={<AssignmentManagement />} requiresAdmin />} 
      />
      <Route 
        path="/admin/chart/:teamId" 
        element={<PrivateRoute element={<TeamChart />} requiresAdmin />} 
      />
      
      {/* Standardumleitung */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <AppRoutes />
          </Layout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
