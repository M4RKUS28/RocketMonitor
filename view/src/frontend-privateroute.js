import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

/**
 * PrivateRoute-Komponente für geschützte Routen
 * @param {Object} props - Komponenten-Props
 * @param {Component} props.component - Die zu rendernde Komponente
 * @param {boolean} props.adminRequired - Gibt an, ob Administratorrechte erforderlich sind
 * @returns {Component} - Geroutete Komponente oder Weiterleitung
 */
const PrivateRoute = ({ component: Component, adminRequired = false, ...rest }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Während der Authentifizierungsstatus geladen wird, zeige einen Ladeindikator
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Wenn der Benutzer nicht angemeldet ist, zur Anmeldeseite weiterleiten
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Wenn Administratorrechte erforderlich sind und der Benutzer kein Admin ist
  if (adminRequired && (!user || !user.is_admin)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Wenn alle Prüfungen bestanden, rendere die geschützte Komponente
  return <Component {...rest} />;
};

export default PrivateRoute;
