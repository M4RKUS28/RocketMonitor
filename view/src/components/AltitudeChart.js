import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert, 
  Card, 
  CardContent
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { altitudeAPI } from '../api';
import { useTheme } from '../contexts/ThemeContext';

// Chart.js Komponenten registrieren
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const AltitudeChart = ({ teamId, title }) => {
  const { isDarkMode } = useTheme();
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Daten für die letzten 24 Stunden laden
        const endTime = new Date();
        const startTime = new Date(endTime);
        startTime.setHours(startTime.getHours() - 24);
        
        const data = await altitudeAPI.getChartData(teamId, startTime, endTime);
        setChartData(data);
      } catch (err) {
        console.error('Fehler beim Laden der Höhendaten:', err);
        setError('Die Höhendaten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchData();
    }
  }, [teamId]);

  // Chart-Konfiguration
  const getChartConfig = () => {
    if (!chartData || !chartData.timestamps || chartData.timestamps.length === 0) {
      return null;
    }

    const labels = chartData.timestamps.map(timestamp => 
      format(new Date(timestamp), 'HH:mm', { locale: de })
    );

    const gradientColor = isDarkMode ? 'rgba(33, 150, 243, 0.8)' : 'rgba(33, 150, 243, 0.8)';
    const fillColor = isDarkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.1)';

    return {
      labels,
      datasets: [
        {
          label: 'Höhe (m)',
          data: chartData.altitudes,
          fill: true,
          backgroundColor: fillColor,
          borderColor: gradientColor,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: gradientColor,
          tension: 0.4,
        },
      ],
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
        min: chartData && chartData.altitudes && chartData.altitudes.length > 0 
          ? Math.max(0, Math.min(...chartData.altitudes) - 5) 
          : 0,
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: isDarkMode ? '#fff' : '#333',
        },
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

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {title || `Höhendaten für ${chartData?.team_name || 'Team'}`}
      </Typography>

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
              height: '400px', 
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
                  Maximale Höhe
                </Typography>
                <Typography variant="h3" sx={{ mt: 1, fontWeight: 'bold' }}>
                  {chartData?.max_altitude?.toFixed(1) || '0'} m
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