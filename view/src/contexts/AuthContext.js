import React, { createContext, useState, useContext, useEffect } from 'react';
import jwt_decode from 'jwt-decode';
import { authAPI } from '../api';

// Auth-Kontext erstellen
const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
  loading: false,
});

// Auth-Provider-Komponente
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Prüfe beim Laden, ob ein gültiger Token vorhanden ist
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Prüfen, ob der Token abgelaufen ist
          const decoded = jwt_decode(token);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            // Token ist abgelaufen
            localStorage.removeItem('token');
            setIsAuthenticated(false);
            setUser(null);
          } else {
            // Token ist gültig, Benutzerdaten laden
            try {
              const userData = await authAPI.getCurrentUser();
              setUser(userData);
              setIsAuthenticated(true);
            } catch (error) {
              console.error('Fehler beim Laden der Benutzerdaten:', error);
              localStorage.removeItem('token');
              setIsAuthenticated(false);
              setUser(null);
            }
          }
        } catch (error) {
          // Token konnte nicht dekodiert werden
          console.error('Ungültiger Token:', error);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  // Login-Funktion
  const login = async (username, password) => {
    try {
      setLoading(true);
      const data = await authAPI.login(username, password);
      
      // Token im LocalStorage speichern
      localStorage.setItem('token', data.access_token);
      
      // Benutzerdaten setzen
      setUser({
        id: data.user_id,
        username: data.username,
        is_admin: data.is_admin,
        team_id: data.team_id,
      });
      
      setIsAuthenticated(true);
      return {"success": true, "is_admin": data.is_admin};
    } catch (error) {
      console.error('Login fehlgeschlagen:', error);
      return {"success": false};
    } finally {
      setLoading(false);
    }
  };

  // Logout-Funktion
  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook für einfachen Zugriff auf den Auth-Kontext
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
