import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupsIcon from '@mui/icons-material/Groups';
import MemoryIcon from '@mui/icons-material/Memory';
import LinkIcon from '@mui/icons-material/Link';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { teamsAPI, adminAPI } from '../../api';

const AdminDashboard = () => {
  const { isDarkMode } = useTheme();
  const [teams, setTeams] = useState([]);
  const [raspberryPis, setRaspberryPis] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Daten parallel laden
        const [teamsData, raspberryData, assignmentsData] = await Promise.all([
          teamsAPI.getAllTeams(),
          adminAPI.getAllRaspberryPis(),
          adminAPI.getAssignments({ active_only: true })
        ]);
        
        setTeams(teamsData);
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
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
            ? 'linear-gradient(135deg,rgb(238, 136, 216) 0%,rgb(129, 50, 103) 100%)' 
            : 'linear-gradient(135deg,rgb(105, 105, 105) 0%,rgb(48, 8, 8) 100%)',
          color: 'white',
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <AdminPanelSettingsIcon fontSize="large" />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Admin Dashboard
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ mt: 1, opacity: 0.9 }}>
          Verwalten Sie Teams, Raspberry Pis und Zuweisungen
        </Typography>
      </Paper>

      {/* Teams Übersicht */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3,
          boxShadow: isDarkMode 
            ? '0 4px 20px rgba(0,0,0,0.3)' 
            : '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <GroupsIcon color="primary" fontSize="large" />
            <Typography variant="h5" color="primary">Teams</Typography>
          </Box>
          <Button 
            variant="contained" 
            color="primary" 
            component={Link} 
            to="/admin/teams"
          >
            Teams verwalten
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        {teams.length === 0 ? (
          <Alert severity="info">Keine Teams vorhanden. Erstellen Sie neue Teams über "Teams verwalten".</Alert>
        ) : (
          <Grid container spacing={3}>
            {teams.slice(0, 4).map((team) => (
              <Grid item key={team.id} xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    height: '100%',
                    borderRadius: 3,
                    transition: 'transform 0.3s',
                    '&:hover': {
                      transform: 'translateY(-5px)'
                    },
                    boxShadow: isDarkMode 
                      ? '0 4px 20px rgba(0,0,0,0.2)' 
                      : '0 4px 20px rgba(0,0,0,0.05)',
                  }}
                >
                  <CardContent>
                    <Typography 
                      variant="h6" 
                      component="div" 
                      sx={{ 
                        mb: 1,
                        fontWeight: 'medium',
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 1,
                      }}
                    >
                      {team.name}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      Erstellt am: {new Date(team.created_at).toLocaleDateString('de-DE')}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Begrüßung: {team.greeting_points}</Typography>
                      <Typography variant="body2">Fragen: {team.questions_points}</Typography>
                    </Box>
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Posten: {team.station_points}</Typography>
                      <Typography variant="body2">Abschied: {team.farewell_points}</Typography>
                    </Box>
                    <Button 
                      fullWidth
                      variant="outlined" 
                      size="small" 
                      component={Link}
                      to={`/admin/teams/${team.id}`}
                      sx={{ mt: 2 }}
                    >
                      Details
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Raspberry Pis Übersicht */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3,
          boxShadow: isDarkMode 
            ? '0 4px 20px rgba(0,0,0,0.3)' 
            : '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <MemoryIcon color="secondary" fontSize="large" />
            <Typography variant="h5" color="secondary">Raspberry Pis</Typography>
          </Box>
          <Button 
            variant="contained" 
            color="secondary" 
            component={Link} 
            to="/admin/raspberry"
          >
            Raspberry Pis verwalten
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        {raspberryPis.length === 0 ? (
          <Alert severity="info">Keine Raspberry Pis vorhanden. Erstellen Sie neue Geräte über "Raspberry Pis verwalten".</Alert>
        ) : (
          <Grid container spacing={3}>
            {raspberryPis.slice(0, 4).map((raspberry) => (
              <Grid item key={raspberry.id} xs={12} sm={6} md={3}>
                <Card 
                  sx={{ 
                    height: '100%',
                    borderRadius: 3,
                    transition: 'transform 0.3s',
                    '&:hover': {
                      transform: 'translateY(-5px)'
                    },
                    boxShadow: isDarkMode 
                      ? '0 4px 20px rgba(0,0,0,0.2)' 
                      : '0 4px 20px rgba(0,0,0,0.05)',
                  }}
                >
                  <CardContent>
                    <Typography 
                      variant="h6" 
                      component="div" 
                      sx={{ 
                        mb: 1,
                        fontWeight: 'medium',
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 1,
                      }}
                    >
                      {raspberry.name}
                    </Typography>
                    <Typography 
                      color="text.secondary" 
                      variant="body2"
                      sx={{
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        height: '40px'
                      }}
                    >
                      {raspberry.description || 'Keine Beschreibung'}
                    </Typography>
                    <Button 
                      fullWidth
                      variant="outlined" 
                      color="secondary"
                      size="small" 
                      component={Link}
                      to={`/admin/raspberry/${raspberry.id}`}
                      sx={{ mt: 2 }}
                    >
                      Details
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Aktive Zuweisungen */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3,
          boxShadow: isDarkMode 
            ? '0 4px 20px rgba(0,0,0,0.3)' 
            : '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <LinkIcon color="info" fontSize="large" />
            <Typography variant="h5" color="info">Aktive Zuweisungen</Typography>
          </Box>
          <Button 
            variant="contained" 
            color="info" 
            component={Link} 
            to="/admin/assignments"
          >
            Zuweisungen verwalten
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        {assignments.length === 0 ? (
          <Alert severity="info">Keine aktiven Zuweisungen vorhanden. Erstellen Sie neue Zuweisungen über "Zuweisungen verwalten".</Alert>
        ) : (
          <Grid container spacing={3}>
            {assignments.map((assignment) => {
              const team = teams.find(t => t.id === assignment.team_id);
              const raspberry = raspberryPis.find(r => r.id === assignment.raspberry_id);
              
              return (
                <Grid item key={`${assignment.team_id}-${assignment.raspberry_id}`} xs={12} sm={6} md={4}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      borderRadius: 3,
                      transition: 'transform 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)'
                      },
                      boxShadow: isDarkMode 
                        ? '0 4px 20px rgba(0,0,0,0.2)' 
                        : '0 4px 20px rgba(0,0,0,0.05)',
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" component="div">
                        {team?.name || `Team ID: ${assignment.team_id}`}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                        <LinkIcon color="info" fontSize="small" sx={{ mr: 1 }} />
                        <Typography variant="body1">
                          {raspberry?.name || `Raspberry ID: ${assignment.raspberry_id}`}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Start: {new Date(assignment.start_time).toLocaleString('de-DE')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Ende: {new Date(assignment.end_time).toLocaleString('de-DE')}
                      </Typography>
                      <Button 
                        fullWidth
                        variant="outlined" 
                        color="info"
                        size="small" 
                        component={Link}
                        to={`/admin/chart/${assignment.team_id}`}
                        sx={{ mt: 2 }}
                      >
                        Höhendaten anzeigen
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>

      {/* Schnellzugriff */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Button 
            fullWidth
            variant="contained" 
            color="primary"
            component={Link}
            to="/admin/teams/new"
            sx={{ 
              py: 2,
              borderRadius: 3,
              boxShadow: isDarkMode 
                ? '0 4px 20px rgba(0,0,0,0.3)' 
                : '0 4px 20px rgba(33,150,243,0.2)',
            }}
          >
            Neues Team erstellen
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button 
            fullWidth
            variant="contained" 
            color="secondary"
            component={Link}
            to="/admin/raspberry/new"
            sx={{ 
              py: 2,
              borderRadius: 3,
              boxShadow: isDarkMode 
                ? '0 4px 20px rgba(0,0,0,0.3)' 
                : '0 4px 20px rgba(245,0,87,0.2)',
            }}
          >
            Raspberry Pi hinzufügen
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button 
            fullWidth
            variant="contained" 
            color="info"
            component={Link}
            to="/admin/assignments/new"
            sx={{ 
              py: 2,
              borderRadius: 3,
              boxShadow: isDarkMode 
                ? '0 4px 20px rgba(0,0,0,0.3)' 
                : '0 4px 20px rgba(3,169,244,0.2)',
            }}
          >
            Neue Zuweisung erstellen
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button 
            fullWidth
            variant="contained" 
            color="success"
            component={Link}
            to="/admin/users"
            sx={{ 
              py: 2,
              borderRadius: 3,
              boxShadow: isDarkMode 
                ? '0 4px 20px rgba(0,0,0,0.3)' 
                : '0 4px 20px rgba(76,175,80,0.2)',
            }}
          >
            Benutzer verwalten
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard;
