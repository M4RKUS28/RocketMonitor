import React from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

const Layout = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Wenn nicht authentifiziert, kein Layout anzeigen (Login-Seite hat eigenes Layout)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header 
        handleDrawerToggle={handleDrawerToggle} 
        isAdmin={user?.is_admin}
      />
      
      {user && (
        <Sidebar 
          mobileOpen={mobileOpen} 
          handleDrawerToggle={handleDrawerToggle}
          isAdmin={user.is_admin}
          drawerWidth={240}
        />
      )}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${240}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
          pt: { xs: 8, md: 9 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;