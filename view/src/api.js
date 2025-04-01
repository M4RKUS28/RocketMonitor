import axios from 'axios';

// API-Basis-URL
const API_URL = '/api'; //'http://localhost:8000';

// Axios-Instanz mit Basis-URL
const axiosInstance = axios.create({ baseURL: API_URL });

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

// Helper function for error handling
const handleApiError = (error, defaultReturn = null, customMessage = '') => {
  const message = customMessage || 'API request failed';
  
  if (axios.isAxiosError(error)) {
    // Handle Axios specific errors
    const status = error.response?.status;
    const responseData = error.response?.data;
    
    console.error(`${message}: ${status}`, {
      endpoint: error.config?.url,
      status,
      data: responseData,
      error
    });
    
    // Enhance error with additional context for better debugging
    error.friendlyMessage = responseData?.detail || message;
  } else {
    // Handle non-Axios errors
    console.error(`${message}:`, error);
  }
  
  // Either return a default value or rethrow the error
  return defaultReturn;
};

// Authentifizierung
export const authAPI = {
  login: async (username, password) => {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await axiosInstance.post(`/token`, formData);
      return response.data;
    } catch (error) {
      // Authentication errors are typically handled at the component level
      // so we rethrow after logging
      handleApiError(error, null, 'Login failed');
      throw error;
    }
  },
  
  register: async (userData) => {
    try {
      const response = await axiosInstance.post(`/register`, userData);
      return response.data;
    } catch (error) {
      handleApiError(error, null, 'User registration failed');
      throw error;
    }
  },
  
  getCurrentUser: async () => {
    try {
      const response = await axiosInstance.get('/me');
      return response.data;
    } catch (error) {
      // Return null for current user if request fails
      return handleApiError(error, null, 'Failed to get current user');
    }
  },
};

// Teams
export const teamsAPI = {
  getAllTeams: async () => {
    try {
      const response = await axiosInstance.get('/teams');
      // Ensure we return an array even if response is unexpected
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      // Return empty array as safe fallback for UI components using map()
      return handleApiError(error, [], 'Failed to get teams');
    }
  },
  
  getTeam: async (teamId) => {
    try {
      const response = await axiosInstance.get(`/teams/${teamId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error, null, `Failed to get team ${teamId}`);
    }
  },
  
  createTeam: async (teamData) => {
    try {
      const response = await axiosInstance.post('/teams', teamData);
      return response.data;
    } catch (error) {
      handleApiError(error, null, 'Failed to create team');
      throw error;
    }
  },
  
  updateTeam: async (teamId, teamData) => {
    try {
      const response = await axiosInstance.put(`/teams/${teamId}`, teamData);
      return response.data;
    } catch (error) {
      handleApiError(error, null, `Failed to update team ${teamId}`);
      throw error;
    }
  },
  
  updateTeamPoints: async (teamId, pointsData) => {
    try {
      const response = await axiosInstance.put(`/teams/${teamId}/points`, pointsData);
      return response.data;
    } catch (error) {
      handleApiError(error, null, `Failed to update points for team ${teamId}`);
      throw error;
    }
  },
  
  deleteTeam: async (teamId) => {
    try {
      const response = await axiosInstance.delete(`/teams/${teamId}`);
      return response.data;
    } catch (error) {
      handleApiError(error, null, `Failed to delete team ${teamId}`);
      throw error;
    }
  },
};

// Benutzer
export const usersAPI = {
  getAllUsers: async () => {
    try {
      const response = await axiosInstance.get('/users');
      // Ensure we return an array even if response is unexpected
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      // Return empty array as safe fallback for UI components using map()
      return handleApiError(error, [], 'Failed to get users');
    }
  },
  
  getUser: async (userId) => {
    try {
      const response = await axiosInstance.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error, null, `Failed to get user ${userId}`);
    }
  },
  
  updateUser: async (userId, userData) => {
    try {
      const response = await axiosInstance.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      handleApiError(error, null, `Failed to update user ${userId}`);
      throw error;
    }
  },
  
  deleteUser: async (userId) => {
    try {
      const response = await axiosInstance.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      handleApiError(error, null, `Failed to delete user ${userId}`);
      throw error;
    }
  },
  
  // New function to register a user (for admins creating new users)
  register: async (userData) => {
    try {
      const response = await axiosInstance.post('/register', userData);
      return response.data;
    } catch (error) {
      handleApiError(error, null, 'Failed to register user');
      throw error;
    }
  },
  
  // Alias for register to make the API more intuitive
  createUser: async (userData) => {
    try {
      return await usersAPI.register(userData);
    } catch (error) {
      handleApiError(error, null, 'Failed to create user');
      throw error;
    }
  },
};

// Höhendaten
export const altitudeAPI = {
  getChartData: async (teamId, startTime, endTime) => {
    try {
      let url = `/altitude/chart/${teamId}`;
      
      // Füge Zeitparameter hinzu, wenn vorhanden
      const params = {};
      if (startTime) params.start_time = startTime.toISOString();
      if (endTime) params.end_time = endTime.toISOString();
      
      const response = await axiosInstance.get(url, { params });
      return response.data;
    } catch (error) {
      // Return default chart data structure to prevent UI errors
      return handleApiError(error, {
        timestamps: [],
        altitudes: [],
        event_groups: [],
        max_altitude: 0,
        team_name: `Team ${teamId}`
      }, `Failed to get chart data for team ${teamId}`);
    }
  },
  
  getAltitudeData: async (filters = {}) => {
    try {
      const response = await axiosInstance.get('/altitude/data', { params: filters });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return handleApiError(error, [], 'Failed to get altitude data');
    }
  },
  
  createAltitudeData: async (data) => {
    try {
      const response = await axiosInstance.post('/altitude/data', data);
      return response.data;
    } catch (error) {
      handleApiError(error, null, 'Failed to create altitude data');
      throw error;
    }
  },
};

// Admin-Funktionen
export const adminAPI = {
  // Raspberry Pi Verwaltung
  getAllRaspberryPis: async () => {
    try {
      const response = await axiosInstance.get('/admin/raspberry');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return handleApiError(error, [], 'Failed to get Raspberry Pis');
    }
  },
  
  createRaspberryPi: async (raspberryData) => {
    try {
      const response = await axiosInstance.post('/admin/raspberry', raspberryData);
      return response.data;
    } catch (error) {
      handleApiError(error, null, 'Failed to create Raspberry Pi');
      throw error;
    }
  },
  
  updateRaspberryPi: async (raspberryId, raspberryData) => {
    try {
      const response = await axiosInstance.put(`/admin/raspberry/${raspberryId}`, raspberryData);
      return response.data;
    } catch (error) {
      handleApiError(error, null, `Failed to update Raspberry Pi ${raspberryId}`);
      throw error;
    }
  },
  
  deleteRaspberryPi: async (raspberryId) => {
    try {
      const response = await axiosInstance.delete(`/admin/raspberry/${raspberryId}`);
      return response.data;
    } catch (error) {
      handleApiError(error, null, `Failed to delete Raspberry Pi ${raspberryId}`);
      throw error;
    }
  },
  
  createAssignment: async (assignmentData) => {
    try {
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
    } catch (error) {
      handleApiError(error, null, 'Failed to create assignment');
      throw error;
    }
  },

  deleteAssignment: async (teamId, raspberryId, startTime = null, endTime = null) => {
    try {
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
    } catch (error) {
      handleApiError(error, null, `Failed to delete assignment for team ${teamId} and Raspberry Pi ${raspberryId}`);
      throw error;
    }
  },
  
  getAssignments: async (filters = {}) => {
    try {
      const response = await axiosInstance.get('/admin/assignments', { params: filters });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return handleApiError(error, [], 'Failed to get assignments');
    }
  },
}

// Add a responseInterceptor to log all responses
axiosInstance.interceptors.response.use(
  (response) => {
    // Optional: Log all successful responses for debugging
    // console.log(`API Success: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    // Log all errors (this is in addition to the specific error handling in each function)
    if (axios.isAxiosError(error)) {
      console.error(`API Error: ${error.config?.url}`, {
        status: error.response?.status,
        data: error.response?.data
      });
    }
    return Promise.reject(error);
  }
);

const apiExports = {
  auth: authAPI,
  teams: teamsAPI,
  users: usersAPI,
  altitude: altitudeAPI,
  admin: adminAPI,
};

export default apiExports;