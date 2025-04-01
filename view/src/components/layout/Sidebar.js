import React from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  Typography, 
  Divider, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  useTheme as useMuiTheme 
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TerrainIcon from '@mui/icons-material/Terrain';
import GroupsIcon from '@mui/icons-material/Groups';
import MemoryIcon from '@mui/icons-material/Memory';
import LinkIcon from '@mui/icons-material/Link';
import PeopleIcon from '@mui/icons-material/People';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ mobileOpen, handleDrawerToggle, isAdmin, drawerWidth = 240 }) => {
  const muiTheme = useMuiTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Menüpunkte für normale Benutzer
  const userMenuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard'
    }
  ];

  // Zusätzliche Menüpunkte für Administratoren
  const adminMenuItems = [
    {
      text: 'Admin Dashboard',
      icon: <DashboardIcon />,
      path: '/admin'
    },
    {
      text: 'Teams',
      icon: <GroupsIcon />,
      path: '/admin/teams'
    },
    {
      text: 'Raspberry Pis',
      icon: <MemoryIcon />,
      path: '/admin/raspberry'
    },
    {
      text: 'Zuweisungen',
      icon: <LinkIcon />,
      path: '/admin/assignments'
    },
    {
      text: 'Benutzer',
      icon: <PeopleIcon />,
      path: '/admin/users'
    }
  ];

  // Menüpunkte basierend auf Benutzerrolle auswählen
  const menuItems = isAdmin ? adminMenuItems : userMenuItems;

  // Drawer-Inhalt
  const drawer = (
    <Box sx={{ 
      overflowX: 'hidden',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Logo und Titel */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          py: 2,
          mt: { xs: 7, md: 0 }, // Add top margin on mobile to account for AppBar
          backgroundColor: muiTheme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.02)'
        }}
      >
        <Avatar 
          sx={{ 
            width: 60,
            height: 60,
            bgcolor: 'primary.main',
            mb: 1
          }}
        >
          <TerrainIcon fontSize="large" />
        </Avatar>
        <Typography variant="h6" fontWeight="bold" color="primary">
          ALTITUDE TRACKER
        </Typography>
        {user && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {isAdmin ? 'Administrator' : 'Team Mitglied'}
          </Typography>
        )}
      </Box>
      
      <Divider />
      
      {/* Menüliste */}
      <List sx={{ pt: 1, flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (mobileOpen) handleDrawerToggle();
              }}
              sx={{
                borderRadius: '0 50px 50px 0',
                mx: 1,
                my: 0.5,
                '&.Mui-selected': {
                  backgroundColor: muiTheme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.12)' 
                    : 'rgba(25, 118, 210, 0.08)',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: muiTheme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'rgba(25, 118, 210, 0.12)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  }
                }
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontSize: '0.95rem',
                  fontWeight: location.pathname === item.path ? 'medium' : 'normal'
                }} 
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ mt: 'auto' }} />
      
      {/* Fußzeile */}
      <Box 
        sx={{ 
          p: 2, 
          textAlign: 'center' 
        }}
      >
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} Altitude Tracking
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
    >
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Bessere Performance auf Mobilgeräten
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            borderRight: `1px solid ${muiTheme.palette.divider}`,
            zIndex: muiTheme.zIndex.drawer + 2, // Higher z-index to appear above AppBar
          },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            borderRight: `1px solid ${muiTheme.palette.divider}`,
            backgroundColor: muiTheme.palette.background.paper,
            backgroundImage: 'none'
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;