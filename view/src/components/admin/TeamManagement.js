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
  CardActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupsIcon from '@mui/icons-material/Groups';
import ScoreboardIcon from '@mui/icons-material/Scoreboard';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { teamsAPI } from '../../api';

const TeamManagement = () => {
  const { isDarkMode } = useTheme();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Dialog-Zustände
  const [newTeamDialog, setNewTeamDialog] = useState(false);
  const [editTeamDialog, setEditTeamDialog] = useState(false);
  const [pointsDialog, setPointsDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  // Form-Zustände
  const [newTeamName, setNewTeamName] = useState('');
  const [editTeamData, setEditTeamData] = useState({ id: null, name: '' });
  const [pointsData, setPointsData] = useState({ 
    id: null, 
    name: '',
    greeting_points: 0, 
    questions_points: 0, 
    station_points: 0, 
    farewell_points: 0 
  });
  const [deleteTeamId, setDeleteTeamId] = useState(null);

  // Daten laden
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await teamsAPI.getAllTeams();
        setTeams(data);
      } catch (err) {
        console.error('Fehler beim Laden der Teams:', err);
        setError('Die Teams konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // Neues Team erstellen
  const handleCreateTeam = async () => {
    try {
      if (!newTeamName.trim()) {
        setSnackbar({ 
          open: true, 
          message: 'Bitte geben Sie einen Teamnamen ein', 
          severity: 'error' 
        });
        return;
      }
      
      const newTeam = await teamsAPI.createTeam({ name: newTeamName });
      setTeams([...teams, newTeam]);
      setNewTeamDialog(false);
      setNewTeamName('');
      setSnackbar({ 
        open: true, 
        message: `Team "${newTeam.name}" erfolgreich erstellt`, 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Fehler beim Erstellen des Teams:', err);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Erstellen des Teams. Möglicherweise existiert bereits ein Team mit diesem Namen.', 
        severity: 'error' 
      });
    }
  };

  // Team bearbeiten
  const handleEditTeam = async () => {
    try {
      if (!editTeamData.name.trim()) {
        setSnackbar({ 
          open: true, 
          message: 'Bitte geben Sie einen Teamnamen ein', 
          severity: 'error' 
        });
        return;
      }
      
      const updatedTeam = await teamsAPI.updateTeam(editTeamData.id, { name: editTeamData.name });
      setTeams(teams.map(team => team.id === updatedTeam.id ? updatedTeam : team));
      setEditTeamDialog(false);
      setSnackbar({ 
        open: true, 
        message: `Team erfolgreich in "${updatedTeam.name}" umbenannt`, 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Fehler beim Bearbeiten des Teams:', err);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Bearbeiten des Teams. Möglicherweise existiert bereits ein Team mit diesem Namen.', 
        severity: 'error' 
      });
    }
  };

  // Team-Punkte aktualisieren
  const handleUpdatePoints = async () => {
    try {
      const pointsUpdate = {
        greeting_points: parseInt(pointsData.greeting_points) || 0,
        questions_points: parseInt(pointsData.questions_points) || 0,
        station_points: parseInt(pointsData.station_points) || 0,
        farewell_points: parseInt(pointsData.farewell_points) || 0
      };
      
      const updatedTeam = await teamsAPI.updateTeamPoints(pointsData.id, pointsUpdate);
      setTeams(teams.map(team => team.id === updatedTeam.id ? updatedTeam : team));
      setPointsDialog(false);
      setSnackbar({ 
        open: true, 
        message: `Punkte für Team "${updatedTeam.name}" erfolgreich aktualisiert`, 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Punkte:', err);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Aktualisieren der Punkte.', 
        severity: 'error' 
      });
    }
  };

  // Team löschen
  const handleDeleteTeam = async () => {
    try {
      if (!deleteTeamId) return;
      
      await teamsAPI.deleteTeam(deleteTeamId);
      setTeams(teams.filter(team => team.id !== deleteTeamId));
      setDeleteDialog(false);
      setSnackbar({ 
        open: true, 
        message: 'Team erfolgreich gelöscht', 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Fehler beim Löschen des Teams:', err);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Löschen des Teams.', 
        severity: 'error' 
      });
    }
  };

  // Dialogfunktionen
  const openEditDialog = (team) => {
    setEditTeamData({ id: team.id, name: team.name });
    setEditTeamDialog(true);
  };

  const openPointsDialog = (team) => {
    setPointsData({
      id: team.id,
      name: team.name,
      greeting_points: team.greeting_points,
      questions_points: team.questions_points,
      station_points: team.station_points,
      farewell_points: team.farewell_points
    });
    setPointsDialog(true);
  };

  const openDeleteDialog = (teamId) => {
    setDeleteTeamId(teamId);
    setDeleteDialog(true);
  };

  // Berechnet die Gesamtpunktzahl
  const calculateTotalPoints = (team) => {
    return team.greeting_points + team.questions_points + 
           team.station_points + team.farewell_points;
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 3,
          background: isDarkMode 
            ? 'linear-gradient(135deg, #1e88e5 0%, #0d47a1 100%)' 
            : 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <GroupsIcon fontSize="large" />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Team-Verwaltung
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          color="secondary" 
          startIcon={<AddIcon />}
          onClick={() => setNewTeamDialog(true)}
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
          Neues Team
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2, mb: 4 }}>{error}</Alert>
      )}

      {teams.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2, mb: 4 }}>
          Keine Teams vorhanden. Erstellen Sie ein neues Team mit dem Button "Neues Team".
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {teams.map((team) => (
            <Grid item xs={12} md={6} key={team.id}>
              <Card 
                sx={{ 
                  borderRadius: 3,
                  boxShadow: isDarkMode 
                    ? '0 4px 20px rgba(0,0,0,0.3)' 
                    : '0 4px 20px rgba(0,0,0,0.1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5" component="h2" fontWeight="bold">
                      {team.name}
                    </Typography>
                    <Box>
                      <IconButton 
                        color="primary" 
                        onClick={() => openEditDialog(team)}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => openDeleteDialog(team.id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box 
                    sx={{ 
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 2,
                      mb: 3
                    }}
                  >
                    <Box 
                      sx={{ 
                        flex: '1 1 calc(50% - 8px)',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: isDarkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
                        border: '1px solid',
                        borderColor: isDarkMode ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.2)',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">Begrüßung</Typography>
                      <Typography variant="h6" color="primary">{team.greeting_points}</Typography>
                    </Box>
                    <Box 
                      sx={{ 
                        flex: '1 1 calc(50% - 8px)',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: isDarkMode ? 'rgba(156, 39, 176, 0.1)' : 'rgba(156, 39, 176, 0.05)',
                        border: '1px solid',
                        borderColor: isDarkMode ? 'rgba(156, 39, 176, 0.3)' : 'rgba(156, 39, 176, 0.2)',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">Fragen</Typography>
                      <Typography variant="h6" color="secondary">{team.questions_points}</Typography>
                    </Box>
                    <Box 
                      sx={{ 
                        flex: '1 1 calc(50% - 8px)',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: isDarkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
                        border: '1px solid',
                        borderColor: isDarkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">Posten</Typography>
                      <Typography variant="h6" color="success.main">{team.station_points}</Typography>
                    </Box>
                    <Box 
                      sx={{ 
                        flex: '1 1 calc(50% - 8px)',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: isDarkMode ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)',
                        border: '1px solid',
                        borderColor: isDarkMode ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 152, 0, 0.2)',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">Verabschiedung</Typography>
                      <Typography variant="h6" color="warning.main">{team.farewell_points}</Typography>
                    </Box>
                  </Box>
                  
                  <Box 
                    sx={{ 
                      p: 2,
                      borderRadius: 2,
                      bgcolor: isDarkMode ? 'rgba(156, 39, 176, 0.15)' : 'rgba(156, 39, 176, 0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Box>
                      <Typography variant="body2" color="text.secondary">Gesamtpunktzahl</Typography>
                      <Typography variant="h5" color="secondary" fontWeight="bold">
                        {calculateTotalPoints(team)}
                      </Typography>
                    </Box>
                    <ScoreboardIcon color="secondary" fontSize="large" />
                  </Box>
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button 
                    color="primary" 
                    startIcon={<ScoreboardIcon />} 
                    onClick={() => openPointsDialog(team)}
                    fullWidth
                    variant="outlined"
                    sx={{ mr: 1 }}
                  >
                    Punkte bearbeiten
                  </Button>
                  <Button 
                    color="info" 
                    startIcon={<VisibilityIcon />} 
                    component={Link}
                    to={`/admin/chart/${team.id}`}
                    fullWidth
                    variant="outlined"
                  >
                    Höhendaten
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Neues Team Dialog */}
      <Dialog open={newTeamDialog} onClose={() => setNewTeamDialog(false)}>
        <DialogTitle>Neues Team erstellen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Geben Sie einen Namen für das neue Team ein.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Teamname"
            type="text"
            fullWidth
            variant="outlined"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTeamDialog(false)}>Abbrechen</Button>
          <Button onClick={handleCreateTeam} variant="contained" color="primary">
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team bearbeiten Dialog */}
      <Dialog open={editTeamDialog} onClose={() => setEditTeamDialog(false)}>
        <DialogTitle>Team bearbeiten</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Ändern Sie den Namen des Teams.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="edit-name"
            label="Teamname"
            type="text"
            fullWidth
            variant="outlined"
            value={editTeamData.name}
            onChange={(e) => setEditTeamData({ ...editTeamData, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTeamDialog(false)}>Abbrechen</Button>
          <Button onClick={handleEditTeam} variant="contained" color="primary">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Punkte Dialog */}
      <Dialog 
        open={pointsDialog} 
        onClose={() => setPointsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Punkte für Team "{pointsData.name}" bearbeiten</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                id="greeting-points"
                label="Begrüßung"
                type="number"
                fullWidth
                variant="outlined"
                value={pointsData.greeting_points}
                onChange={(e) => setPointsData({ ...pointsData, greeting_points: e.target.value })}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                id="questions-points"
                label="Fragen"
                type="number"
                fullWidth
                variant="outlined"
                value={pointsData.questions_points}
                onChange={(e) => setPointsData({ ...pointsData, questions_points: e.target.value })}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                id="station-points"
                label="Posten"
                type="number"
                fullWidth
                variant="outlined"
                value={pointsData.station_points}
                onChange={(e) => setPointsData({ ...pointsData, station_points: e.target.value })}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                id="farewell-points"
                label="Verabschiedung"
                type="number"
                fullWidth
                variant="outlined"
                value={pointsData.farewell_points}
                onChange={(e) => setPointsData({ ...pointsData, farewell_points: e.target.value })}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
          </Grid>
          <Box 
            sx={{ 
              mt: 3, 
              p: 2, 
              borderRadius: 2, 
              bgcolor: isDarkMode ? 'rgba(156, 39, 176, 0.15)' : 'rgba(156, 39, 176, 0.1)',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <Typography variant="subtitle1">Gesamtpunktzahl:</Typography>
            <Typography variant="h6" color="secondary" fontWeight="bold">
              {parseInt(pointsData.greeting_points || 0) + 
               parseInt(pointsData.questions_points || 0) + 
               parseInt(pointsData.station_points || 0) + 
               parseInt(pointsData.farewell_points || 0)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPointsDialog(false)}>Abbrechen</Button>
          <Button onClick={handleUpdatePoints} variant="contained" color="primary">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Löschen Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
      >
        <DialogTitle>Team löschen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sind Sie sicher, dass Sie dieses Team löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Abbrechen</Button>
          <Button onClick={handleDeleteTeam} variant="contained" color="error">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar für Benachrichtigungen */}
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

export default TeamManagement;