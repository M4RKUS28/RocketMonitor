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
import MemoryIcon from '@mui/icons-material/Memory';
import LinkIcon from '@mui/icons-material/Link';
import { useTheme } from '../../contexts/ThemeContext';
import { adminAPI } from '../../api';

const RaspberryManagement = () => {
  const { isDarkMode } = useTheme();
  const [raspberryPis, setRaspberryPis] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Dialog-Zustände
  const [newRaspberryDialog, setNewRaspberryDialog] = useState(false);
  const [editRaspberryDialog, setEditRaspberryDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  // Form-Zustände
  const [newRaspberryData, setNewRaspberryData] = useState({ name: '', description: '' });
  const [editRaspberryData, setEditRaspberryData] = useState({ id: null, name: '', description: '' });
  const [deleteRaspberryId, setDeleteRaspberryId] = useState(null);

  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [raspberryData, assignmentsData] = await Promise.all([
          adminAPI.getAllRaspberryPis(),
          adminAPI.getAssignments()
        ]);
        setRaspberryPis(raspberryData);
        setAssignments(assignmentsData);
      } catch (err) {
        console.error('Fehler beim Laden der Daten:', err);
        setError('Die Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Neuen Raspberry Pi erstellen
  const handleCreateRaspberry = async () => {
    try {
      if (!newRaspberryData.name.trim()) {
        setSnackbar({ 
          open: true, 
          message: 'Bitte geben Sie einen Namen ein', 
          severity: 'error' 
        });
        return;
      }
      
      const newRaspberry = await adminAPI.createRaspberryPi(newRaspberryData);
      setRaspberryPis([...raspberryPis, newRaspberry]);
      setNewRaspberryDialog(false);
      setNewRaspberryData({ name: '', description: '' });
      setSnackbar({ 
        open: true, 
        message: `Raspberry Pi "${newRaspberry.name}" erfolgreich erstellt`, 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Fehler beim Erstellen des Raspberry Pi:', err);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Erstellen des Raspberry Pi. Möglicherweise existiert bereits ein Gerät mit diesem Namen.', 
        severity: 'error' 
      });
    }
  };

  // Raspberry Pi bearbeiten
  const handleEditRaspberry = async () => {
    try {
      if (!editRaspberryData.name.trim()) {
        setSnackbar({ 
          open: true, 
          message: 'Bitte geben Sie einen Namen ein', 
          severity: 'error' 
        });
        return;
      }
      
      const updatedRaspberry = await adminAPI.updateRaspberryPi(
        editRaspberryData.id, 
        { 
          name: editRaspberryData.name,
          description: editRaspberryData.description 
        }
      );
      
      setRaspberryPis(raspberryPis.map(pi => 
        pi.id === updatedRaspberry.id ? updatedRaspberry : pi
      ));
      
      setEditRaspberryDialog(false);
      setSnackbar({ 
        open: true, 
        message: `Raspberry Pi "${updatedRaspberry.name}" erfolgreich aktualisiert`, 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Fehler beim Bearbeiten des Raspberry Pi:', err);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Bearbeiten des Raspberry Pi. Möglicherweise existiert bereits ein Gerät mit diesem Namen.', 
        severity: 'error' 
      });
    }
  };

  // Raspberry Pi löschen
  const handleDeleteRaspberry = async () => {
    try {
      if (!deleteRaspberryId) return;
      
      await adminAPI.deleteRaspberryPi(deleteRaspberryId);
      setRaspberryPis(raspberryPis.filter(pi => pi.id !== deleteRaspberryId));
      setDeleteDialog(false);
      setSnackbar({ 
        open: true, 
        message: 'Raspberry Pi erfolgreich gelöscht', 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Fehler beim Löschen des Raspberry Pi:', err);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Löschen des Raspberry Pi. Möglicherweise ist das Gerät noch einem Team zugewiesen.', 
        severity: 'error' 
      });
    }
  };

  // Dialogfunktionen
  const openEditDialog = (raspberry) => {
    setEditRaspberryData({ 
      id: raspberry.id, 
      name: raspberry.name, 
      description: raspberry.description || '' 
    });
    setEditRaspberryDialog(true);
  };

  const openDeleteDialog = (raspberryId) => {
    setDeleteRaspberryId(raspberryId);
    setDeleteDialog(true);
  };

  // Prüft, ob ein Raspberry Pi aktive Zuweisungen hat
  const hasActiveAssignments = (raspberryId) => {
    const now = new Date();
    return assignments.some(assignment => 
      assignment.raspberry_id === raspberryId && 
      new Date(assignment.end_time) > now
    );
  };

  // Findet alle Zuweisungen für einen Raspberry Pi
  const getAssignmentsForRaspberry = (raspberryId) => {
    return assignments.filter(assignment => 
      assignment.raspberry_id === raspberryId
    );
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
            ? 'linear-gradient(135deg,rgb(94, 86, 88) 0%,rgb(141, 19, 74) 100%)' 
            : 'linear-gradient(135deg, #ff4081 0%, #f50057 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <MemoryIcon fontSize="large" />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Raspberry Pi Verwaltung
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          color="secondary" 
          startIcon={<AddIcon />}
          onClick={() => setNewRaspberryDialog(true)}
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
          Neuer Raspberry Pi
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2, mb: 4 }}>{error}</Alert>
      )}

      {raspberryPis.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2, mb: 4 }}>
          Keine Raspberry Pis vorhanden. Erstellen Sie ein neues Gerät mit dem Button "Neuer Raspberry Pi".
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {raspberryPis.map((raspberry) => {
            const activeAssignment = hasActiveAssignments(raspberry.id);
            const raspberryAssignments = getAssignmentsForRaspberry(raspberry.id);
            
            return (
              <Grid item xs={12} md={6} key={raspberry.id}>
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
                  {activeAssignment && (
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
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h5" component="h2" fontWeight="bold" color="secondary">
                        {raspberry.name}
                      </Typography>
                      <Box>
                        <IconButton 
                          color="secondary" 
                          onClick={() => openEditDialog(raspberry)}
                          size="small"
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => openDeleteDialog(raspberry.id)}
                          size="small"
                          disabled={activeAssignment}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Typography 
                      variant="body1" 
                      color="text.secondary"
                      sx={{ 
                        mb: 3,
                        height: '60px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {raspberry.description || 'Keine Beschreibung vorhanden'}
                    </Typography>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      Zuweisungen
                    </Typography>
                    
                    {raspberryAssignments.length === 0 ? (
                      <Box 
                        sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Keine Zuweisungen
                        </Typography>
                      </Box>
                    ) : (
                      <Box 
                        sx={{ 
                          maxHeight: '150px', 
                          overflowY: 'auto', 
                          pr: 1,
                          '&::-webkit-scrollbar': {
                            width: '8px',
                          },
                          '&::-webkit-scrollbar-track': {
                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                            borderRadius: 4,
                          },
                          '&::-webkit-scrollbar-thumb': {
                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                            borderRadius: 4,
                          }
                        }}
                      >
                        {raspberryAssignments.map((assignment, index) => {
                          const now = new Date();
                          const isActive = new Date(assignment.end_time) > now && new Date(assignment.start_time) <= now;
                          
                          return (
                            <Box 
                              key={index}
                              sx={{ 
                                p: 1.5, 
                                borderRadius: 2, 
                                mb: 1,
                                bgcolor: isActive 
                                  ? (isDarkMode ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)')
                                  : (isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)'),
                                border: '1px solid',
                                borderColor: isActive 
                                  ? (isDarkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)')
                                  : 'transparent',
                              }}
                            >
                              <Box display="flex" alignItems="center" mb={0.5}>
                                <LinkIcon color="info" fontSize="small" sx={{ mr: 1 }} />
                                <Typography variant="body2" fontWeight="medium">
                                  Team ID: {assignment.team_id}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Von: {new Date(assignment.start_time).toLocaleString('de-DE')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Bis: {new Date(assignment.end_time).toLocaleString('de-DE')}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </CardContent>
                  
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button 
                      fullWidth
                      variant="contained" 
                      color="secondary"
                      onClick={() => openEditDialog(raspberry)}
                    >
                      Bearbeiten
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Neuer Raspberry Pi Dialog */}
      <Dialog 
        open={newRaspberryDialog} 
        onClose={() => setNewRaspberryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Neuen Raspberry Pi hinzufügen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Geben Sie einen Namen und optional eine Beschreibung für den neuen Raspberry Pi ein.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newRaspberryData.name}
            onChange={(e) => setNewRaspberryData({ ...newRaspberryData, name: e.target.value })}
            sx={{ mb: 2, mt: 2 }}
          />
          <TextField
            margin="dense"
            id="description"
            label="Beschreibung (optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={newRaspberryData.description}
            onChange={(e) => setNewRaspberryData({ ...newRaspberryData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewRaspberryDialog(false)}>Abbrechen</Button>
          <Button onClick={handleCreateRaspberry} variant="contained" color="primary">
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Raspberry Pi bearbeiten Dialog */}
      <Dialog 
        open={editRaspberryDialog} 
        onClose={() => setEditRaspberryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Raspberry Pi bearbeiten</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Ändern Sie den Namen und die Beschreibung des Raspberry Pi.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="edit-name"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editRaspberryData.name}
            onChange={(e) => setEditRaspberryData({ ...editRaspberryData, name: e.target.value })}
            sx={{ mb: 2, mt: 2 }}
          />
          <TextField
            margin="dense"
            id="edit-description"
            label="Beschreibung (optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={editRaspberryData.description}
            onChange={(e) => setEditRaspberryData({ ...editRaspberryData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRaspberryDialog(false)}>Abbrechen</Button>
          <Button onClick={handleEditRaspberry} variant="contained" color="primary">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Löschen Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
      >
        <DialogTitle>Raspberry Pi löschen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sind Sie sicher, dass Sie diesen Raspberry Pi löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Abbrechen</Button>
          <Button onClick={handleDeleteRaspberry} variant="contained" color="error">
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

export default RaspberryManagement;
