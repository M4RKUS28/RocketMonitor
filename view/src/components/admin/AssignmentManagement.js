import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  CardActions,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useTheme } from '../../contexts/ThemeContext';
import { adminAPI, teamsAPI } from '../../api';
import { format, addMinutes } from 'date-fns';

const AssignmentManagement = () => {
  const { isDarkMode } = useTheme();
  const [assignments, setAssignments] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]); // Store all assignments
  const [teams, setTeams] = useState([]);
  const [raspberryPis, setRaspberryPis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Dialog-Zustände
  const [newAssignmentDialog, setNewAssignmentDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  // Form-Zustände
  const [newAssignmentData, setNewAssignmentData] = useState({
    team_id: '',
    raspberry_id: '',
    duration_minutes: 60,
    start_time: new Date()
  });
  const [deleteAssignmentData, setDeleteAssignmentData] = useState({
    team_id: null,
    raspberry_id: null,
    start_time: null,
    end_time: null
  });

  // Filter-Zustände
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Prüfen, ob eine Zuweisung aktiv ist
  const isAssignmentActive = (assignment) => {
    const now = new Date();
    return new Date(assignment.end_time) > now && new Date(assignment.start_time) <= now;
  };

  // Filter assignments based on active status
  const filterAssignments = () => {
    if (!showActiveOnly) {
      return allAssignments;
    }
    return allAssignments.filter(assignment => isAssignmentActive(assignment));
  };

  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Daten parallel laden - always get all assignments
        const [teamsData, raspberryData, assignmentsData] = await Promise.all([
          teamsAPI.getAllTeams(),
          adminAPI.getAllRaspberryPis(),
          adminAPI.getAssignments({ active_only: false }) // Always get all assignments
        ]);
        
        setTeams(teamsData);
        setRaspberryPis(raspberryData);
        setAllAssignments(assignmentsData); // Store all assignments
        
        // Apply filter
        setAssignments(
          showActiveOnly 
            ? assignmentsData.filter(assignment => isAssignmentActive(assignment))
            : assignmentsData
        );
      } catch (err) {
        console.error('Fehler beim Laden der Daten:', err);
        setError('Die Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Only fetch data on component mount

  // Update displayed assignments when filter changes
  useEffect(() => {
    setAssignments(filterAssignments());
  }, [showActiveOnly, allAssignments]);

  // Neue Zuweisung erstellen
  const handleCreateAssignment = async () => {
    try {
      if (!newAssignmentData.team_id || !newAssignmentData.raspberry_id) {
        setSnackbar({ 
          open: true, 
          message: 'Bitte wählen Sie ein Team und einen Raspberry Pi aus', 
          severity: 'error' 
        });
        return;
      }
      
      if (newAssignmentData.duration_minutes <= 0) {
        setSnackbar({ 
          open: true, 
          message: 'Die Dauer muss größer als 0 sein', 
          severity: 'error' 
        });
        return;
      }
      
      // Convert minutes to hours for the API - precise conversion
      const durationHours = newAssignmentData.duration_minutes / 60.0;
      
      // Create a new Date object from the start_time to ensure consistency
      const startTime = new Date(newAssignmentData.start_time);
      console.log("Startzeit vor Senden:", startTime);
      
      const newAssignment = await adminAPI.createAssignment({
        team_id: newAssignmentData.team_id,
        raspberry_id: newAssignmentData.raspberry_id,
        duration_hours: durationHours,
        start_time: startTime
      });
      
      console.log("Neue Zuweisung erstellt:", newAssignment);
      
      // Get all assignments
      const refreshedAssignments = await adminAPI.getAssignments({ active_only: false });
      setAllAssignments(refreshedAssignments);
      
      setNewAssignmentDialog(false);
      setNewAssignmentData({
        team_id: '',
        raspberry_id: '',
        duration_minutes: 60,
        start_time: new Date()
      });
      
      setSnackbar({ 
        open: true, 
        message: 'Zuweisung erfolgreich erstellt', 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Fehler beim Erstellen der Zuweisung:', err);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Erstellen der Zuweisung: ' + (err.response?.data?.detail || err.message), 
        severity: 'error' 
      });
    }
  };

  // Zuweisung löschen
  const handleDeleteAssignment = async () => {
    try {
      if (!deleteAssignmentData.team_id || !deleteAssignmentData.raspberry_id) return;
      
      console.log("Lösche Zuweisung:", deleteAssignmentData);
      
      // Pass all four parameters to uniquely identify the assignment
      await adminAPI.deleteAssignment(
        deleteAssignmentData.team_id, 
        deleteAssignmentData.raspberry_id,
        deleteAssignmentData.start_time,
        deleteAssignmentData.end_time
      );
      
      // Update the all assignments list
      setAllAssignments(allAssignments.filter(assignment => {
        return !(
          assignment.team_id === deleteAssignmentData.team_id && 
          assignment.raspberry_id === deleteAssignmentData.raspberry_id &&
          assignment.start_time === deleteAssignmentData.start_time &&
          assignment.end_time === deleteAssignmentData.end_time
        );
      }));
      
      setDeleteDialog(false);
      setSnackbar({ 
        open: true, 
        message: 'Zuweisung erfolgreich gelöscht', 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Fehler beim Löschen der Zuweisung:', err);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Löschen der Zuweisung: ' + (err.response?.data?.detail || err.message), 
        severity: 'error' 
      });
    }
  };

  // Zuweisung zum Löschen vorbereiten
  const openDeleteDialog = (teamId, raspberryId, startTime, endTime) => {
    console.log("Öffne Löschen-Dialog:", teamId, raspberryId, startTime, endTime);
    setDeleteAssignmentData({ 
      team_id: teamId, 
      raspberry_id: raspberryId,
      start_time: startTime,
      end_time: endTime
    });
    setDeleteDialog(true);
  };

  // Teamname anhand der ID finden
  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : `Team ID: ${teamId}`;
  };

  // Raspberry Pi Name anhand der ID finden
  const getRaspberryName = (raspberryId) => {
    const raspberry = raspberryPis.find(r => r.id === raspberryId);
    return raspberry ? raspberry.name : `Raspberry ID: ${raspberryId}`;
  };

  // Toggle für aktive Zuweisungen Filter
  const toggleActiveFilter = () => {
    setShowActiveOnly(!showActiveOnly);
  };

  // Vorschau der Zuweisungszeiten berechnen
  const calculateAssignmentTimes = () => {
    const startTime = newAssignmentData.start_time || new Date();
    const endTime = addMinutes(new Date(startTime), newAssignmentData.duration_minutes);
    
    return {
      startTime,
      endTime
    };
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
            ? 'linear-gradient(135deg, #03a9f4 0%, #0288d1 100%)' 
            : 'linear-gradient(135deg, #29b6f6 0%, #0288d1 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <LinkIcon fontSize="large" />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Zuweisungsverwaltung
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          color="secondary" 
          startIcon={<AddIcon />}
          onClick={() => setNewAssignmentDialog(true)}
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
          Neue Zuweisung
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2, mb: 4 }}>{error}</Alert>
      )}

      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}
      >
        <Typography variant="h6">
          {showActiveOnly ? 'Aktive Zuweisungen' : 'Alle Zuweisungen'}
        </Typography>
        <Button 
          variant={showActiveOnly ? "outlined" : "contained"} 
          color="info"
          onClick={toggleActiveFilter}
        >
          {showActiveOnly ? 'Alle anzeigen' : 'Nur aktive anzeigen'}
        </Button>
      </Box>

      {assignments.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2, mb: 4 }}>
          Keine Zuweisungen gefunden. Erstellen Sie eine neue Zuweisung mit dem Button "Neue Zuweisung".
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {assignments.map((assignment, index) => {
            const isActive = isAssignmentActive(assignment);
            const teamName = getTeamName(assignment.team_id);
            const raspberryName = getRaspberryName(assignment.raspberry_id);
            
            return (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card 
                  sx={{ 
                    borderRadius: 3,
                    boxShadow: isDarkMode 
                      ? '0 4px 20px rgba(0,0,0,0.3)' 
                      : '0 4px 20px rgba(0,0,0,0.1)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'visible'
                  }}
                >
                  {isActive && (
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: -10, 
                        right: -10, 
                        bgcolor: 'success.main', 
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
                      Aktiv
                    </Box>
                  )}
                  
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box 
                      sx={{ 
                        p: 2, 
                        borderRadius: 3, 
                        mb: 2,
                        bgcolor: isDarkMode ? 'rgba(3, 169, 244, 0.1)' : 'rgba(3, 169, 244, 0.05)',
                        border: '1px solid',
                        borderColor: isDarkMode ? 'rgba(3, 169, 244, 0.3)' : 'rgba(3, 169, 244, 0.2)',
                      }}
                    >
                      <Typography variant="h6" component="h2" fontWeight="medium" color="info.main">
                        {teamName}
                      </Typography>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          mt: 1,
                          color: 'text.secondary'
                        }}
                      >
                        <LinkIcon color="info" fontSize="small" sx={{ mr: 1 }} />
                        <Typography variant="body1">
                          {raspberryName}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box 
                      sx={{ 
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 2,
                        mb: 2
                      }}
                    >
                      <AccessTimeIcon color="action" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Startet am:
                        </Typography>
                        <Typography variant="body1">
                          {format(new Date(assignment.start_time), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box 
                      sx={{ 
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 2
                      }}
                    >
                      <AccessTimeIcon color="action" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Endet am:
                        </Typography>
                        <Typography variant="body1">
                          {format(new Date(assignment.end_time), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button 
                      fullWidth
                      variant="outlined" 
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => openDeleteDialog(
                        assignment.team_id, 
                        assignment.raspberry_id,
                        assignment.start_time,
                        assignment.end_time
                      )}
                    >
                      Zuweisung löschen
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Neue Zuweisung Dialog */}
      <Dialog 
        open={newAssignmentDialog} 
        onClose={() => setNewAssignmentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Neue Zuweisung erstellen</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Weisen Sie einem Team einen Raspberry Pi für einen bestimmten Zeitraum zu.
          </DialogContentText>
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 3, mt: 1 }}>
            <InputLabel id="team-select-label">Team</InputLabel>
            <Select
              labelId="team-select-label"
              id="team-select"
              value={newAssignmentData.team_id}
              onChange={(e) => setNewAssignmentData({ ...newAssignmentData, team_id: e.target.value })}
              label="Team"
            >
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
            <InputLabel id="raspberry-select-label">Raspberry Pi</InputLabel>
            <Select
              labelId="raspberry-select-label"
              id="raspberry-select"
              value={newAssignmentData.raspberry_id}
              onChange={(e) => setNewAssignmentData({ ...newAssignmentData, raspberry_id: e.target.value })}
              label="Raspberry Pi"
            >
              {raspberryPis.map((raspberry) => (
                <MenuItem key={raspberry.id} value={raspberry.id}>
                  {raspberry.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
            <DateTimePicker
              label="Startzeit"
              value={newAssignmentData.start_time}
              onChange={(newDateTime) => {
                console.log("Neue Startzeit ausgewählt:", newDateTime);
                setNewAssignmentData({ 
                  ...newAssignmentData, 
                  start_time: newDateTime 
                });
              }}
              slotProps={{
                textField: { fullWidth: true, sx: { mb: 3 } },
              }}
            />
          </LocalizationProvider>
          
          <TextField
            id="duration-minutes"
            label="Dauer (Minuten)"
            type="number"
            fullWidth
            variant="outlined"
            value={newAssignmentData.duration_minutes}
            onChange={(e) => setNewAssignmentData({ ...newAssignmentData, duration_minutes: parseInt(e.target.value) })}
            InputProps={{ inputProps: { min: 1, step: 1 } }}
            sx={{ mb: 3 }}
          />
          
          {newAssignmentData.team_id && newAssignmentData.raspberry_id && newAssignmentData.duration_minutes > 0 && (
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                bgcolor: isDarkMode ? 'rgba(3, 169, 244, 0.1)' : 'rgba(3, 169, 244, 0.05)',
                border: '1px solid',
                borderColor: isDarkMode ? 'rgba(3, 169, 244, 0.3)' : 'rgba(3, 169, 244, 0.2)',
              }}
            >
              <Typography variant="subtitle2" gutterBottom>Zuweisungsdetails:</Typography>
              <Typography variant="body2">
                <strong>Team:</strong> {getTeamName(newAssignmentData.team_id)}
              </Typography>
              <Typography variant="body2">
                <strong>Raspberry Pi:</strong> {getRaspberryName(newAssignmentData.raspberry_id)}
              </Typography>
              
              {(() => {
                const { startTime, endTime } = calculateAssignmentTimes();
                return (
                  <>
                    <Typography variant="body2">
                      <strong>Startzeit:</strong> {format(startTime, 'dd.MM.yyyy HH:mm', { locale: de })}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Endzeit:</strong> {format(endTime, 'dd.MM.yyyy HH:mm', { locale: de })}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Dauer:</strong> {newAssignmentData.duration_minutes} Minuten
                    </Typography>
                  </>
                );
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewAssignmentDialog(false)}>Abbrechen</Button>
          <Button onClick={handleCreateAssignment} variant="contained" color="primary">
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Löschen Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
      >
        <DialogTitle>Zuweisung löschen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sind Sie sicher, dass Sie diese Zuweisung löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
          {deleteAssignmentData.team_id && deleteAssignmentData.raspberry_id && (
            <Box 
              sx={{ 
                mt: 2, 
                p: 2, 
                borderRadius: 2, 
                bgcolor: isDarkMode ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.05)',
                border: '1px solid',
                borderColor: isDarkMode ? 'rgba(244, 67, 54, 0.3)' : 'rgba(244, 67, 54, 0.2)',
              }}
            >
              <Typography variant="body2">
                <strong>Team:</strong> {getTeamName(deleteAssignmentData.team_id)}
              </Typography>
              <Typography variant="body2">
                <strong>Raspberry Pi:</strong> {getRaspberryName(deleteAssignmentData.raspberry_id)}
              </Typography>
              {deleteAssignmentData.start_time && (
                <Typography variant="body2">
                  <strong>Startet am:</strong> {format(new Date(deleteAssignmentData.start_time), 'dd.MM.yyyy HH:mm', { locale: de })}
                </Typography>
              )}
              {deleteAssignmentData.end_time && (
                <Typography variant="body2">
                  <strong>Endet am:</strong> {format(new Date(deleteAssignmentData.end_time), 'dd.MM.yyyy HH:mm', { locale: de })}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Abbrechen</Button>
          <Button onClick={handleDeleteAssignment} variant="contained" color="error">
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

export default AssignmentManagement;