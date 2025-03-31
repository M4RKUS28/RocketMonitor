import axios from 'axios';

// API-Basis-URL
const API_URL = 'http://localhost:8000';

// Axios-Instanz mit Basis-URL
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Request-Interceptor zur Hinzufügung des Authorization-Headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Authentifizierung
export const authAPI = {
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await axios.post(`${API_URL}/token`, formData);
    return response.data;
  },
  
  register: async (userData) => {
    const response = await axios.post(`${API_URL}/register`, userData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await axiosInstance.get('/me');
    return response.data;
  },
};

// Teams
export const teamsAPI = {
  getAllTeams: async () => {
    const response = await axiosInstance.get('/teams');
    return response.data;
  },
  
  getTeam: async (teamId) => {
    const response = await axiosInstance.get(`/teams/${teamId}`);
    return response.data;
  },
  
  createTeam: async (teamData) => {
    const response = await axiosInstance.post('/teams', teamData);
    return response.data;
  },
  
  updateTeam: async (teamId, teamData) => {
    const response = await axiosInstance.put(`/teams/${teamId}`, teamData);
    return response.data;
  },
  
  updateTeamPoints: async (teamId, pointsData) => {
    const response = await axiosInstance.put(`/teams/${teamId}/points`, pointsData);
    return response.data;
  },
  
  deleteTeam: async (teamId) => {
    const response = await axiosInstance.delete(`/teams/${teamId}`);
    return response.data;
  },
};

// Benutzer
export const usersAPI = {
  getAllUsers: async () => {
    const response = await axiosInstance.get('/users');
    return response.data;
  },
  
  getUser: async (userId) => {
    const response = await axiosInstance.get(`/users/${userId}`);
    return response.data;
  },
  
  updateUser: async (userId, userData) => {
    const response = await axiosInstance.put(`/users/${userId}`, userData);
    return response.data;
  },
  
  deleteUser: async (userId) => {
    const response = await axiosInstance.delete(`/users/${userId}`);
    return response.data;
  },
};

// Höhendaten
export const altitudeAPI = {
  getChartData: async (teamId, startTime, endTime) => {
    let url = `/altitude/chart/${teamId}`;
    
    // Füge Zeitparameter hinzu, wenn vorhanden
    const params = {};
    if (startTime) params.start_time = startTime.toISOString();
    if (endTime) params.end_time = endTime.toISOString();
    
    const response = await axiosInstance.get(url, { params });
    return response.data;
  },
  
  getAltitudeData: async (filters = {}) => {
    const response = await axiosInstance.get('/altitude/data', { params: filters });
    return response.data;
  },
  
  createAltitudeData: async (data) => {
    const response = await axiosInstance.post('/altitude/data', data);
    return response.data;
  },
};

// Admin-Funktionen
export const adminAPI = {
  // Raspberry Pi Verwaltung
  getAllRaspberryPis: async () => {
    const response = await axiosInstance.get('/admin/raspberry');
    return response.data;
  },
  
  createRaspberryPi: async (raspberryData) => {
    const response = await axiosInstance.post('/admin/raspberry', raspberryData);
    return response.data;
  },
  
  updateRaspberryPi: async (raspberryId, raspberryData) => {
    const response = await axiosInstance.put(`/admin/raspberry/${raspberryId}`, raspberryData);
    return response.data;
  },
  
  deleteRaspberryPi: async (raspberryId) => {
    const response = await axiosInstance.delete(`/admin/raspberry/${raspberryId}`);
    return response.data;
  },
  
  // Update the createAssignment function in adminAPI
  createAssignment: async (assignmentData) => {
    // Ensure the data is properly formatted
    const data = {
      team_id: assignmentData.team_id,
      raspberry_id: assignmentData.raspberry_id,
      duration_hours: parseFloat(assignmentData.duration_hours.toFixed(2))
    };
    
    // Format date as YYYY-MM-DD HH:MM:SS to avoid timezone issues
    if (assignmentData.start_time) {
      const d = new Date(assignmentData.start_time);
      // Format date in a way that keeps it as local time
      const localDateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      data.start_time = localDateString;
    }
    
    console.log("Sending assignment data:", data);
    const response = await axiosInstance.post('/admin/assignments', data);
    return response.data;
  },

  // Update the deleteAssignment function with the same date formatting
  deleteAssignment: async (teamId, raspberryId, startTime = null, endTime = null) => {
    const params = { 
      team_id: teamId, 
      raspberry_id: raspberryId 
    };
    
    // Format dates the same way for deletion
    if (startTime) {
      const d = new Date(startTime);
      const localDateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      params.start_time = localDateString;
    }
    
    if (endTime) {
      const d = new Date(endTime);
      const localDateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      params.end_time = localDateString;
    }
    
    console.log("Delete parameters:", params);
    const response = await axiosInstance.delete('/admin/assignments', { params });
    return response.data;
  },
  
  getAssignments: async (filters = {}) => {
    const response = await axiosInstance.get('/admin/assignments', { params: filters });
    return response.data;
  },
  
};

const apiExports = {
  auth: authAPI,
  teams: teamsAPI,
  users: usersAPI,
  altitude: altitudeAPI,
  admin: adminAPI,
};

export default apiExports;