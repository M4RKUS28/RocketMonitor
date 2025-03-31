import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  Button,
  Divider
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { de } from 'date-fns/locale';
import TerrainIcon from '@mui/icons-material/Terrain';
import { useTheme } from '../../contexts/ThemeContext';
import AltitudeChart from '../AltitudeChart';
import { teamsAPI } from '../../api';

const TeamChart = () => {
  const { teamId } = useParams();
  const { isDarkMode } = useTheme();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Zeitraum-Zustände
  const [startTime, setStartTime] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() - 24); // 24 Stunden zurück
    return date;
  });
  const [endTime, setEndTime] = useState(new Date());
  const [timeRangeChanged, setTimeRangeChanged] = useState(false);
  
  // Daten laden
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (teamId) {
          const data = await teamsAPI.getTeam(parseInt(teamId));
          setTeam(data);
        } else {
          setError('Keine Team-ID angegeben.');
        }
      } catch (err) {
        console.error('Fehler beim Laden der Team-Daten:', err);
        setError('Die Team-Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [teamId]);

  // Zeitspannen zur Auswahl
  const timeRanges = [
    { label: 'Letzte Stunde', value: 1 },
    { label: 'Letzte 3 Stunden', value: 3 },
    { label: 'Letzte 6 Stunden', value: 6 },
    { label: 'Letzte 12 Stunden', value: 12 },
    { label: 'Letzte 24 Stunden', value: 24 },
    { label: 'Letzte 2 Tage', value: 48 },
    { label: 'Letzte Woche', value: 168 },
    { label: 'Benutzerdefiniert', value: 'custom' }
  ];

  // Zeitspanne ändern
  const handleTimeRangeChange = (hours) => {
    if (hours === 'custom') {
      // Benutzerdefinierte Zeitspanne: nichts ändern
      setTimeRangeChanged(true);
      return;
    }
    
    // Vordefinierte Zeitspanne
    const end = new Date();
    const start = new Date(end);
    start.setHours(start.getHours() - hours);
    
    setStartTime(start);
    setEndTime(end);
    setTimeRangeChanged(true);
  };

  // Zeitraum zurücksetzen
  const resetTimeRange = () => {
    const end = new Date();
    const start = new Date(end);
    start.setHours(start.getHours() - 24); // 24 Stunden zurück
    
    setStartTime(start);
    setEndTime(end);
    setTimeRangeChanged(true);
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

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      </Container>
    );
  }

  if (!team) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info">Kein Team gefunden.</Alert>
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
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <TerrainIcon fontSize="large" />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Höhendaten: {team.name}
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ mt: 1, opacity: 0.9 }}>
          Gesamtpunktzahl: {team.greeting_points + team.questions_points + team.station_points + team.farewell_points} Punkte
        </Typography>
      </Paper>

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
        <Typography variant="h6" gutterBottom>Zeitraum auswählen</Typography>
        <Divider sx={{ mb: 3 }} />
        {/*
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="time-range-label">Zeitspanne</InputLabel>
              <Select
                labelId="time-range-label"
                id="time-range"
                label="Zeitspanne"
                defaultValue={24}
                onChange={(e) => handleTimeRangeChange(e.target.value)}
              >
                {timeRanges.map((range) => (
                  <MenuItem key={range.value} value={range.value}>
                    {range.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
            <Grid item xs={12} md={4}>
              <DateTimePicker
                label="Startzeit"
                value={startTime}
                onChange={(newValue) => {
                  setStartTime(newValue);
                  setTimeRangeChanged(false);
                }}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <DateTimePicker
                label="Endzeit"
                value={endTime}
                onChange={(newValue) => {
                  setEndTime(newValue);
                  setTimeRangeChanged(false);
                }}
                renderInput={(params) => <TextField {...params} fullWidth />}
                minDateTime={startTime}
              />
            </Grid>
          </LocalizationProvider>
        </Grid>
        <Box 
          sx={{ 
            mt: 3, 
            display: 'flex', 
            justifyContent: 'flex-end',
            gap: 2
          }}
        >
          <Button 
            variant="outlined" 
            onClick={resetTimeRange}
          >
            Zurücksetzen
          </Button>
          
          <Button 
            variant="contained" 
            onClick={() => setTimeRangeChanged(true)}
            disabled={timeRangeChanged}
          >
            Aktualisieren
          </Button>
        </Box>
         */}
      </Paper>


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
        <AltitudeChart 
          teamId={parseInt(teamId)} 
          startTime={startTime}
          endTime={endTime}
          key={`${startTime}-${endTime}-${timeRangeChanged}`}
          title={`Höhenverlauf für Team: ${team.name}`}
        />
      </Paper>
      
      {/* Punkteübersicht */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mt: 4,
          borderRadius: 3,
          boxShadow: isDarkMode 
            ? '0 4px 20px rgba(0,0,0,0.3)' 
            : '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Typography variant="h6" gutterBottom>Team-Punkteübersicht</Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                bgcolor: isDarkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
                border: '1px solid',
                borderColor: isDarkMode ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.2)',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">Begrüßung</Typography>
              <Typography variant="h4" color="primary">{team.greeting_points}</Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                bgcolor: isDarkMode ? 'rgba(156, 39, 176, 0.1)' : 'rgba(156, 39, 176, 0.05)',
                border: '1px solid',
                borderColor: isDarkMode ? 'rgba(156, 39, 176, 0.3)' : 'rgba(156, 39, 176, 0.2)',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">Fragen</Typography>
              <Typography variant="h4" color="secondary">{team.questions_points}</Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                bgcolor: isDarkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
                border: '1px solid',
                borderColor: isDarkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">Posten</Typography>
              <Typography variant="h4" color="success.main">{team.station_points}</Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                bgcolor: isDarkMode ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)',
                border: '1px solid',
                borderColor: isDarkMode ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 152, 0, 0.2)',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">Verabschiedung</Typography>
              <Typography variant="h4" color="warning.main">{team.farewell_points}</Typography>
            </Box>
          </Grid>
        </Grid>
        
        <Box 
          sx={{ 
            mt: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: isDarkMode ? 'rgba(156, 39, 176, 0.15)' : 'rgba(156, 39, 176, 0.1)',
            textAlign: 'center'
          }}
        >
          <Typography variant="subtitle1" color="text.secondary">Gesamtpunktzahl</Typography>
          <Typography 
            variant="h3" 
            color="secondary"
            sx={{ fontWeight: 'bold' }}
          >
            {team.greeting_points + team.questions_points + team.station_points + team.farewell_points}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default TeamChart;