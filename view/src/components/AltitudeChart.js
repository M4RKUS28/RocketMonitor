import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert, 
  Card, 
  CardContent,
  Chip,
  Tooltip,
  IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { altitudeAPI } from '../api';
import { useTheme } from '../contexts/ThemeContext';

// Chart.js Komponenten registrieren
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend, Filler);

// Auto-Refresh Intervall in Millisekunden (30 Sekunden)
const AUTO_REFRESH_INTERVAL = 20000;

// Vordefinierte Farben für die Gruppen
const GROUP_COLORS = [
  { borderColor: 'rgba(33, 150, 243, 0.8)', backgroundColor: 'rgba(33, 150, 243, 0.1)' }, // Blau
  { borderColor: 'rgba(76, 175, 80, 0.8)', backgroundColor: 'rgba(76, 175, 80, 0.1)' },   // Grün
  { borderColor: 'rgba(156, 39, 176, 0.8)', backgroundColor: 'rgba(156, 39, 176, 0.1)' }, // Lila
  { borderColor: 'rgba(255, 152, 0, 0.8)', backgroundColor: 'rgba(255, 152, 0, 0.1)' },   // Orange
  { borderColor: 'rgba(244, 67, 54, 0.8)', backgroundColor: 'rgba(244, 67, 54, 0.1)' },   // Rot
  { borderColor: 'rgba(0, 188, 212, 0.8)', backgroundColor: 'rgba(0, 188, 212, 0.1)' },   // Cyan
  { borderColor: 'rgba(233, 30, 99, 0.8)', backgroundColor: 'rgba(233, 30, 99, 0.1)' },   // Pink
  { borderColor: 'rgba(205, 220, 57, 0.8)', backgroundColor: 'rgba(205, 220, 57, 0.1)' }, // Lime
];

const AltitudeChart = ({ teamId, title, startTime: initialStartTime, endTime: initialEndTime }) => {
  const { isDarkMode } = useTheme();
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Zeitbereich bestimmen - nutze benutzerdefinierte Werte oder Standard (24h)
  const getTimeRange = useCallback(() => {
    if (initialEndTime && initialStartTime) {
      return { startTime: initialStartTime, endTime: initialEndTime };
    }
    
    const endTime = new Date();
    const startTime = new Date(endTime);
    startTime.setHours(startTime.getHours() - 24);
    return { startTime, endTime };
  }, [initialStartTime, initialEndTime]);

  // Daten laden
  const fetchData = useCallback(async () => {
    if (!teamId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { startTime, endTime } = getTimeRange();
      
      const data = await altitudeAPI.getChartData(teamId, startTime, endTime);
      setChartData(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Fehler beim Laden der Höhendaten:', err);
      setError('Die Höhendaten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  }, [teamId, getTimeRange]);

  // Initiales Laden und Auto-Refresh Einrichtung
  useEffect(() => {
    let intervalId;
    
    fetchData();
    
    if (autoRefresh) {
      intervalId = setInterval(fetchData, AUTO_REFRESH_INTERVAL);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchData, autoRefresh]);

  // Auto-Refresh umschalten
  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  // Manuelles Aktualisieren
  const handleManualRefresh = () => {
    fetchData();
  };

  // Chart-Konfiguration
  const getChartConfig = () => {
    if (!chartData || !chartData.timestamps || chartData.timestamps.length === 0) {
      return null;
    }

    // Erstelle ein einheitliches Set von Labels für die x-Achse
    const labels = chartData.timestamps.map(timestamp => 
      format(new Date(timestamp), 'HH:mm', { locale: de })
    );

    // Gruppiere Daten nach event_group
    const eventGroups = {};
    
    // Gruppiere die Daten nach event_group
    for (let i = 0; i < chartData.timestamps.length; i++) {
      const groupId = chartData.event_groups[i];
      if (!eventGroups[groupId]) {
        eventGroups[groupId] = {
          timestamps: [],
          altitudes: [],
          indices: []
        };
      }
      eventGroups[groupId].timestamps.push(chartData.timestamps[i]);
      eventGroups[groupId].altitudes.push(chartData.altitudes[i]);
      eventGroups[groupId].indices.push(i);
    }

    // Berechne für jede Gruppe das Minimum und normalisiere die Werte
    Object.keys(eventGroups).forEach(groupId => {
      const group = eventGroups[groupId];
      const minAltitude = Math.min(...group.altitudes);
      group.normalizedAltitudes = group.altitudes.map(alt => alt - minAltitude);
    });

    // Erstelle Datasets für jede Gruppe
    const datasets = Object.keys(eventGroups).map((groupId, index) => {
      const group = eventGroups[groupId];
      const colorIndex = index % GROUP_COLORS.length;
      const colorSet = GROUP_COLORS[colorIndex];
      
      // Erstelle ein Array der gleichen Länge wie labels, aber mit null-Werten
      // außer an den Stellen, die dieser Gruppe entsprechen
      const groupData = new Array(labels.length).fill(null);
      
      // Fülle nur die Indizes dieser Gruppe mit Werten
      group.indices.forEach((originalIndex, i) => {
        groupData[originalIndex] = group.normalizedAltitudes[i];
      });
      
      return {
        label: `Gruppe ${groupId}`,
        data: groupData,
        fill: true,
        backgroundColor: colorSet.backgroundColor,
        borderColor: colorSet.borderColor,
        borderWidth: 2,
        pointRadius: 1,
        pointBackgroundColor: colorSet.borderColor,
        tension: 0.4,
        spanGaps: false // Verbinde keine Punkte über Lücken hinweg
      };
    });

    return {
      labels,
      datasets
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDarkMode ? '#fff' : '#333',
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: isDarkMode ? 'rgba(40, 40, 40, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDarkMode ? '#fff' : '#333',
        bodyColor: isDarkMode ? '#fff' : '#333',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(1) + ' m (relativ)';
            }
            return label;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#333',
        },
      },
      y: {
        beginAtZero: true, // Beginne immer bei 0
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#333',
        },
        title: {
          display: true,
          text: 'Höhe (m, relativ zum Minimum jeder Messung)',
          color: isDarkMode ? '#fff' : '#333'
        }
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    animation: {
      duration: 1000,
    },
  };

  const data = getChartConfig();

  // Berechnet die maximale relative Höhe aus allen normalisierten Gruppen
  const getMaxRelativeHeight = () => {
    if (!data || !data.datasets) return 0;
    
    let maxHeight = 0;
    data.datasets.forEach(dataset => {
      const maxInDataset = Math.max(...dataset.data.filter(v => v !== null));
      if (maxInDataset > maxHeight) {
        maxHeight = maxInDataset;
      }
    });
    
    return maxHeight;
  };
  
  // Anzahl der unterschiedlichen Event-Gruppen
  const getNumberOfGroups = () => {
    if (!chartData || !chartData.event_groups) return 0;
    return new Set(chartData.event_groups).size;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" gutterBottom>
          {title || `Höhendaten für ${chartData?.team_name || 'Team'}`}
        </Typography>
        
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={`Zuletzt aktualisiert: ${lastRefreshed.toLocaleTimeString('de-DE')}`}>
            <Chip 
              size="small"
              label={`Aktualisiert: ${lastRefreshed.toLocaleTimeString('de-DE')}`} 
              color="info" 
              variant="outlined"
            />
          </Tooltip>
          
          <Tooltip title={autoRefresh ? "Auto-Refresh deaktivieren" : "Auto-Refresh aktivieren"}>
            <IconButton 
              size="small" 
              color={autoRefresh ? "success" : "default"} 
              onClick={toggleAutoRefresh}
            >
              <AutorenewIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Jetzt aktualisieren">
            <IconButton 
              size="small" 
              color="primary" 
              onClick={handleManualRefresh}
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : !data ? (
        <Alert severity="info">Keine Höhendaten verfügbar</Alert>
      ) : (
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              flexGrow: 1, 
              height: '520px', 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 3,
              boxShadow: isDarkMode 
                ? '0 4px 20px rgba(0,0,0,0.5)' 
                : '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            <Box flexGrow={1}>
              <Line data={data} options={chartOptions} />
            </Box>
          </Paper>

          <Card 
            sx={{ 
              width: { xs: '100%', md: '300px' }, 
              borderRadius: 3,
              background: isDarkMode 
                ? 'linear-gradient(145deg, #1e88e5 0%, #0d47a1 100%)' 
                : 'linear-gradient(145deg, #42a5f5 0%, #1976d2 100%)',
              color: 'white',
              boxShadow: isDarkMode 
                ? '0 4px 20px rgba(0,0,0,0.5)' 
                : '0 4px 20px rgba(33,150,243,0.3)',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Höhen-Informationen
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                  Absolute Maximale Höhe
                </Typography>
                <Typography variant="h3" sx={{ mt: 1, fontWeight: 'bold' }}>
                  {chartData?.max_altitude?.toFixed(1) || '0'} m
                </Typography>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                  Maximale Höhendifferenz
                </Typography>
                <Typography variant="h3" sx={{ mt: 1, fontWeight: 'bold' }}>
                  {getMaxRelativeHeight().toFixed(1) || '0'} m
                </Typography>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                  Messgruppen
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {getNumberOfGroups()}
                </Typography>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                  Datenpunkte
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {chartData?.altitudes?.length || 0}
                </Typography>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                  Zeitraum
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {chartData?.timestamps?.length > 0 ? (
                    `${format(new Date(chartData.timestamps[0]), 'dd.MM.yyyy HH:mm', { locale: de })} - 
                     ${format(new Date(chartData.timestamps[chartData.timestamps.length - 1]), 'dd.MM.yyyy HH:mm', { locale: de })}`
                  ) : 'Keine Daten'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};


export default AltitudeChart;