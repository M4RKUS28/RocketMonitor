import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  Snackbar,
  Grid,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  Switch,
  FormControlLabel,
  Badge,
  FormHelperText,
  Select,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import KeyIcon from '@mui/icons-material/Key';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useTheme } from '../../contexts/ThemeContext';
import { usersAPI, teamsAPI } from '../../api';

const UserManagement = () => {
  const { isDarkMode } = useTheme();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Dialog states
  const [newUserDialog, setNewUserDialog] = useState(false);
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  // Form states
  const [newUserData, setNewUserData] = useState({ 
    username: '', 
    email: '', 
    password: '',
    is_admin: false,
    team_id: 0
  });
  const [editUserData, setEditUserData] = useState({ 
    id: null, 
    username: '', 
    email: '',
    is_admin: false,
    is_active: true,
    team_id: 0
  });
  const [passwordData, setPasswordData] = useState({ id: null, username: '', password: '' });
  const [deleteUserId, setDeleteUserId] = useState(null);
  
  // Password visibility toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load data in parallel
        const [usersData, teamsData] = await Promise.all([
          usersAPI.getAllUsers(),
          teamsAPI.getAllTeams()
        ]);
        
        setUsers(usersData);
        setTeams(teamsData);
      } catch (err) {
        console.error('Error loading users data:', err);
        setError('The users data could not be loaded. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create new user
  const handleCreateUser = async () => {
    try {
      // Validation
      if (!newUserData.username.trim()) {
        setSnackbar({ 
          open: true, 
          message: 'Please enter a username', 
          severity: 'error' 
        });
        return;
      }
      
      if (!newUserData.email.trim() || !newUserData.email.includes('@')) {
        setSnackbar({ 
          open: true, 
          message: 'Please enter a valid email address', 
          severity: 'error' 
        });
        return;
      }
      
      if (!newUserData.password.trim()) {
        setSnackbar({ 
          open: true, 
          message: 'Please enter a password', 
          severity: 'error' 
        });
        return;
      }
      
      // Create user using the API
      const userData = {
        ...newUserData,
        // Set team_id to null if 0 is selected (no team)
        team_id: newUserData.team_id === 0 ? null : newUserData.team_id
      };
      
      // Since the function doesn't exist yet in the API, we'll use register for now
      const newUser = await usersAPI.register(userData);
      setUsers([...users, newUser]);
      setNewUserDialog(false);
      setNewUserData({ 
        username: '', 
        email: '', 
        password: '',
        is_admin: false,
        team_id: 0
      });
      
      setSnackbar({ 
        open: true, 
        message: `User "${newUser.username}" successfully created`, 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Error creating user:', err);
      setSnackbar({ 
        open: true, 
        message: 'Error creating user. The username or email may already be taken.', 
        severity: 'error' 
      });
    }
  };

  // Edit user
  const handleEditUser = async () => {
    try {
      // Validation
      if (!editUserData.username.trim()) {
        setSnackbar({ 
          open: true, 
          message: 'Please enter a username', 
          severity: 'error' 
        });
        return;
      }
      
      if (!editUserData.email.trim() || !editUserData.email.includes('@')) {
        setSnackbar({ 
          open: true, 
          message: 'Please enter a valid email address', 
          severity: 'error' 
        });
        return;
      }
      
      // Update user using the API
      const userData = {
        username: editUserData.username,
        email: editUserData.email,
        is_active: editUserData.is_active,
        is_admin: editUserData.is_admin,
        // Set team_id to null if 0 is selected (no team)
        team_id: editUserData.team_id === 0 ? null : editUserData.team_id
      };
      
      const updatedUser = await usersAPI.updateUser(editUserData.id, userData);
      setUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user));
      setEditUserDialog(false);
      
      setSnackbar({ 
        open: true, 
        message: `User "${updatedUser.username}" successfully updated`, 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Error updating user:', err);
      setSnackbar({ 
        open: true, 
        message: 'Error updating user. The username or email may already be taken.', 
        severity: 'error' 
      });
    }
  };
  
  // Update password
  const handleUpdatePassword = async () => {
    try {
      if (!passwordData.password.trim()) {
        setSnackbar({ 
          open: true, 
          message: 'Please enter a password', 
          severity: 'error' 
        });
        return;
      }
      
      const updatedUser = await usersAPI.updateUser(passwordData.id, { password: passwordData.password });
      setPasswordDialog(false);
      setPasswordData({ id: null, username: '', password: '' });
      
      setSnackbar({ 
        open: true, 
        message: `Password for user "${updatedUser.username}" successfully updated`, 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Error updating password:', err);
      setSnackbar({ 
        open: true, 
        message: 'Error updating password.', 
        severity: 'error' 
      });
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    try {
      if (!deleteUserId) return;
      
      await usersAPI.deleteUser(deleteUserId);
      setUsers(users.filter(user => user.id !== deleteUserId));
      setDeleteDialog(false);
      
      setSnackbar({ 
        open: true, 
        message: 'User successfully deleted', 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Error deleting user:', err);
      setSnackbar({ 
        open: true, 
        message: 'Error deleting user. You cannot delete your own account.', 
        severity: 'error' 
      });
    }
  };

  // Dialog functions
  const openEditDialog = (user) => {
    setEditUserData({ 
      id: user.id, 
      username: user.username, 
      email: user.email,
      is_admin: user.is_admin,
      is_active: user.is_active,
      team_id: user.team_id || 0
    });
    setEditUserDialog(true);
  };
  
  const openPasswordDialog = (user) => {
    setPasswordData({ id: user.id, username: user.username, password: '' });
    setPasswordDialog(true);
  };

  const openDeleteDialog = (userId) => {
    setDeleteUserId(userId);
    setDeleteDialog(true);
  };
  
  // Toggle password visibility
  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };
  
  const toggleEditPasswordVisibility = () => {
    setShowEditPassword(!showEditPassword);
  };

  // Get team name by ID
  const getTeamName = (teamId) => {
    if (!teamId) return 'No Team';
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : `Team ${teamId}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Make sure we have a fallback if the API functions don't exist yet
  if (!usersAPI.createUser && usersAPI.register) {
    usersAPI.createUser = usersAPI.register;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 3,
          background: isDarkMode 
            ? 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)' 
            : 'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <PeopleIcon fontSize="large" />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            User Management
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          color="secondary" 
          startIcon={<AddIcon />}
          onClick={() => setNewUserDialog(true)}
          sx={{ 
            borderRadius: 2,
            px: 3,
            py: 1,
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            bgcolor: 'rgba(255,255,255,0.2)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.3)',
            }
          }}
        >
          New User
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2, mb: 4 }}>{error}</Alert>
      )}

      {users.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2, mb: 4 }}>
          No users found. Create a new user with the "New User" button.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {users.map((user) => (
            <Grid item xs={12} md={6} key={user.id}>
              <Card 
                sx={{ 
                  borderRadius: 3,
                  boxShadow: isDarkMode 
                    ? '0 4px 20px rgba(0,0,0,0.3)' 
                    : '0 4px 20px rgba(0,0,0,0.1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {user.is_admin && (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: -10, 
                      right: -10, 
                      bgcolor: 'primary.main', 
                      color: 'white',
                      p: 1,
                      px: 2,
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                      zIndex: 1
                    }}
                  >
                    ADMIN
                  </Box>
                )}
                
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {user.is_admin ? 
                        <SupervisorAccountIcon color="primary" fontSize="large" /> : 
                        <PersonOutlineIcon color="action" fontSize="large" />
                      }
                      <Typography variant="h5" component="h2" fontWeight="bold">
                        {user.username}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton 
                        color="primary" 
                        onClick={() => openEditDialog(user)}
                        size="small"
                        sx={{ mr: 1 }}
                        title="Edit user"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="warning" 
                        onClick={() => openPasswordDialog(user)}
                        size="small"
                        sx={{ mr: 1 }}
                        title="Change password"
                      >
                        <KeyIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => openDeleteDialog(user.id)}
                        size="small"
                        title="Delete user"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box 
                    sx={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      mb: 2
                    }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      <strong>Email:</strong> {user.email}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      <strong>Status:</strong> {user.is_active ? 'Active' : 'Inactive'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      <strong>Team:</strong> {getTeamName(user.team_id)}
                    </Typography>
                  </Box>
                  
                  <Box 
                    sx={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: user.is_admin 
                        ? (isDarkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)')
                        : (isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.05)')
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      {user.is_admin ? 
                        <AdminPanelSettingsIcon color="primary" /> : 
                        <VerifiedUserIcon color="action" />
                      }
                      <Typography variant="body1" fontWeight="medium">
                        {user.is_admin ? 'Administrator' : 'Regular User'}
                      </Typography>
                    </Box>
                    <Badge 
                      color={user.is_active ? "success" : "error"} 
                      variant="dot" 
                      sx={{ '& .MuiBadge-badge': { width: 10, height: 10 } }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Typography>
                    </Badge>
                  </Box>
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    startIcon={<EditIcon />} 
                    onClick={() => openEditDialog(user)}
                    fullWidth
                  >
                    Edit User
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* New User Dialog */}
      <Dialog open={newUserDialog} onClose={() => setNewUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the details for the new user.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="username"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={newUserData.username}
            onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <TextField
            margin="dense"
            id="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={newUserData.email}
            onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <FormControl variant="outlined" fullWidth sx={{ mb: 2 }}>
            <InputLabel htmlFor="new-password">Password</InputLabel>
            <OutlinedInput
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              value={newUserData.password}
              onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Toggle password visibility"
                    onClick={toggleNewPasswordVisibility}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              label="Password"
            />
          </FormControl>
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="team-select-label">Team</InputLabel>
            <Select
              labelId="team-select-label"
              id="team-select"
              value={newUserData.team_id}
              onChange={(e) => setNewUserData({ ...newUserData, team_id: e.target.value })}
              label="Team"
            >
              <MenuItem value={0}>No Team</MenuItem>
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Assign the user to a team (optional)</FormHelperText>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={newUserData.is_admin}
                onChange={(e) => setNewUserData({ ...newUserData, is_admin: e.target.checked })}
                color="primary"
              />
            }
            label="Administrator privileges"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewUserDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialog} onClose={() => setEditUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Update the user details.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="edit-username"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={editUserData.username}
            onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <TextField
            margin="dense"
            id="edit-email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={editUserData.email}
            onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="edit-team-select-label">Team</InputLabel>
            <Select
              labelId="edit-team-select-label"
              id="edit-team-select"
              value={editUserData.team_id}
              onChange={(e) => setEditUserData({ ...editUserData, team_id: e.target.value })}
              label="Team"
            >
              <MenuItem value={0}>No Team</MenuItem>
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Assign the user to a team (optional)</FormHelperText>
          </FormControl>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={editUserData.is_admin}
                  onChange={(e) => setEditUserData({ ...editUserData, is_admin: e.target.checked })}
                  color="primary"
                />
              }
              label="Administrator privileges"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={editUserData.is_active}
                  onChange={(e) => setEditUserData({ ...editUserData, is_active: e.target.checked })}
                  color="success"
                />
              }
              label="Active account"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserDialog(false)}>Cancel</Button>
          <Button onClick={handleEditUser} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Change the password for user "{passwordData.username}".
          </DialogContentText>
          <FormControl variant="outlined" fullWidth sx={{ mt: 2 }}>
            <InputLabel htmlFor="edit-password">New Password</InputLabel>
            <OutlinedInput
              id="edit-password"
              type={showEditPassword ? 'text' : 'password'}
              value={passwordData.password}
              onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Toggle password visibility"
                    onClick={toggleEditPasswordVisibility}
                    edge="end"
                  >
                    {showEditPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              label="New Password"
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdatePassword} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this user? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserManagement;