import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import TerrainIcon from '@mui/icons-material/Terrain';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AltitudeChart from './AltitudeChart';
import { teamsAPI } from '../api';

const TeamDashboard = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (user && user.team_id) {
          const data = await teamsAPI.getTeam(user.team_id);
          setTeamData(data);
        } else {
          setError('Sie sind keinem Team zugeordnet.');
        }
      } catch (err) {
        console.error('Fehler beim Laden der Team-Daten:', err);
        setError('Die Team-Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [user]);

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

  if (!teamData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info">Kein Team gefunden. Bitte wenden Sie sich an Ihren Administrator.</Alert>
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
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <TerrainIcon fontSize="large" />
            Team Dashboard
          </Typography>
          <Typography variant="h5" sx={{ mt: 1, opacity: 0.9 }}>
            Willkommen, {user?.username}!
          </Typography>
        </Box>
        
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            mt: { xs: 3, md: 0 }
          }}
        >
          <PeopleIcon fontSize="large" />
          <Typography variant="h5">
            {teamData.name}
          </Typography>
        </Box>
      </Paper>

      {teamData.points_visible ? (
        <>
          {/* Punkteübersicht */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderRadius: 3,
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)'
                  },
                  boxShadow: isDarkMode 
                    ? '0 4px 20px rgba(0,0,0,0.3)' 
                    : '0 4px 20px rgba(0,0,0,0.1)',
                }}
              >
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Begrüßung
                  </Typography>
                  <Typography variant="h3" component="div" color="primary">
                    {teamData.greeting_points}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Punkte für den ersten Eindruck
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderRadius: 3,
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)'
                  },
                  boxShadow: isDarkMode 
                    ? '0 4px 20px rgba(0,0,0,0.3)' 
                    : '0 4px 20px rgba(0,0,0,0.1)',
                }}
              >
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Fragen
                  </Typography>
                  <Typography variant="h3" component="div" color="primary">
                    {teamData.questions_points}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Punkte für richtige Antworten
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderRadius: 3,
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)'
                  },
                  boxShadow: isDarkMode 
                    ? '0 4px 20px rgba(0,0,0,0.3)' 
                    : '0 4px 20px rgba(0,0,0,0.1)',
                }}
              >
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Posten
                  </Typography>
                  <Typography variant="h3" component="div" color="primary">
                    {teamData.station_points}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Punkte für die Stationsarbeit
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderRadius: 3,
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)'
                  },
                  boxShadow: isDarkMode 
                    ? '0 4px 20px rgba(0,0,0,0.3)' 
                    : '0 4px 20px rgba(0,0,0,0.1)',
                }}
              >
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Verabschiedung
                  </Typography>
                  <Typography variant="h3" component="div" color="primary">
                    {teamData.farewell_points}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Punkte für den Abschluss
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Gesamtpunktzahl */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mb: 4 
            }}
          >
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                width: { xs: '100%', md: '50%' },
                borderRadius: 3,
                background: isDarkMode 
                  ? 'linear-gradient(145deg, #6a1b9a 0%, #4a148c 100%)' 
                  : 'linear-gradient(145deg, #9c27b0 0%, #7b1fa2 100%)',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <EmojiEventsIcon fontSize="large" />
                <Typography variant="h5">Gesamtpunktzahl</Typography>
              </Box>
              <Typography 
                variant="h2" 
                component="div" 
                sx={{ 
                  fontWeight: 'bold',
                  mt: 1
                }}
              >
                {teamData.total_points}
              </Typography>
            </Paper>
          </Box>
        </>
      ) : (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            mb: 4, 
            borderRadius: 3,
            textAlign: 'center',
            background: isDarkMode 
              ? 'linear-gradient(145deg, #424242 0%, #303030 100%)' 
              : 'linear-gradient(145deg, #f5f5f5 0%, #e0e0e0 100%)'
          }}
        >
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Punktestand wird angezeigt, sobald alle Teams die Aufgaben abgeschlossen haben
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Der Administrator wird die Ergebnisse freischalten, wenn der Wettbewerb abgeschlossen ist.
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Höhendiagramm */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          borderRadius: 3,
          boxShadow: isDarkMode 
            ? '0 4px 20px rgba(0,0,0,0.3)' 
            : '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            mb: 2
          }}
        >
          <EqualizerIcon color="primary" fontSize="large" />
          <Typography variant="h5" color="primary">Höhenverlauf</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <AltitudeChart teamId={user.team_id} />
      </Paper>
    </Container>
  );
};

export default TeamDashboard;