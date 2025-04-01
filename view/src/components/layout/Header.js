import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box, 
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Divider,
  ListItemIcon,
  useMediaQuery
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import TerrainIcon from '@mui/icons-material/Terrain';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Header = ({ handleDrawerToggle, isAdmin }) => {
  const muiTheme = useMuiTheme();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const handleThemeToggle = () => {
    toggleTheme();
    handleClose();
  };

  const getUserInitials = () => {
    if (!user || !user.username) return '?';
    return user.username.substring(0, 1).toUpperCase();
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{
        width: { md: `calc(100% - ${240}px)` },
        ml: { md: `${240}px` },
        boxShadow: 'none',
        borderBottom: `1px solid ${muiTheme.palette.divider}`,
        backgroundColor: muiTheme.palette.background.paper,
        color: muiTheme.palette.text.primary,
        zIndex: muiTheme.zIndex.drawer + 1,
      }}
    >
      <Toolbar 
        sx={{ 
          justifyContent: 'space-between',
          minHeight: { xs: 64, md: 70 },
          px: { xs: 1, sm: 2 } // Smaller padding on mobile to give more space
        }}
      >
        {/* Left side - Menu button on mobile and logo */}
        <Box display="flex" alignItems="center">
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 1, 
              display: { md: 'none' },
              position: 'relative', // Ensure proper stacking context
              zIndex: 1200, // Higher than AppBar but lower than drawer
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 1
            }}
          >
            <TerrainIcon color="primary" fontSize="large" />
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/dashboard"
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                fontWeight: 700,
                letterSpacing: '.1rem',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              ALTITUDE TRACKER
            </Typography>
          </Box>
        </Box>

        {/* Right side - User menu */}
        <Box display="flex" alignItems="center" gap={2}>
          {/* Theme toggle button (visible on larger screens) */}
          {!isSmallScreen && (
            <Tooltip title={isDarkMode ? "Light Mode" : "Dark Mode"}>
              <IconButton onClick={handleThemeToggle} color="inherit">
                {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          )}
          
          {/* Admin indicator for larger screens */}
          {isAdmin && !isSmallScreen && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                bgcolor: 'primary.main', 
                color: 'primary.contrastText',
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                fontSize: '0.8rem',
                fontWeight: 'medium'
              }}
            >
              <AdminPanelSettingsIcon fontSize="small" sx={{ mr: 0.5 }} />
              ADMIN
            </Box>
          )}
          
          {/* User menu */}
          <Box>
            <Tooltip title="Account settings">
              <IconButton
                onClick={handleClick}
                size="small"
                aria-controls={open ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
              >
                <Avatar 
                  sx={{ 
                    width: 40, 
                    height: 40,
                    bgcolor: isAdmin ? 'primary.main' : 'secondary.main',
                    color: '#fff',
                    fontWeight: 'bold'
                  }}
                >
                  {getUserInitials()}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
          
          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={open}
            onClose={handleClose}
            PaperProps={{
              elevation: 3,
              sx: {
                overflow: 'visible',
                mt: 1.5,
                width: 200,
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem sx={{ py: 1 }}>
              <Avatar 
                sx={{ 
                  mr: 2, 
                  width: 32, 
                  height: 32,
                  bgcolor: isAdmin ? 'primary.main' : 'secondary.main'
                }}
              >
                {getUserInitials()}
              </Avatar>
              <Box>
                <Typography variant="subtitle2">{user?.username}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {isAdmin ? 'Administrator' : 'Team Mitglied'}
                </Typography>
              </Box>
            </MenuItem>
            
            <Divider />
            
            {/* Theme toggle in menu (visible on small screens) */}
            {isSmallScreen && (
              <MenuItem onClick={handleThemeToggle}>
                <ListItemIcon>
                  {isDarkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </ListItemIcon>
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </MenuItem>
            )}
            
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Abmelden
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;