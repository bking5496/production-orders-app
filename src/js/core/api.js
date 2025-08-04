// api.js - Enhanced API Service Layer with proper error handling
class EnhancedApiService {
  constructor() {
    this.baseURL = window.APP_CONFIG?.API_BASE || '/api';
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }
  
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    
    // Add JWT token if available in localStorage  
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }
  
  async handleResponse(response) {
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Clear token and redirect to login
        localStorage.removeItem('token');
        if (window.EventBus) {
          window.EventBus.emit('auth:logout');
        }
        throw new Error('Session expired. Please login again.');
      }
      
      // Parse error response
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'Request failed', success: false };
      }
      
      // Create structured error
      const error = new Error(errorData.error || errorData.message || 'Request failed');
      error.response = {
        status: response.status,
        data: errorData,
        success: errorData.success || false
      };
      throw error;
    }
    
    // Handle empty responses
    if (response.headers.get('content-length') === '0') {
      return { success: true, data: null };
    }
    
    try {
      const data = await response.json();
      return data;
    } catch {
      return { success: true, data: null };
    }
  }
  
  // Retry logic for failed requests
  async retryRequest(requestFn, attempts = this.retryAttempts) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await requestFn();
      } catch (error) {
        // Don't retry authentication errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw error;
        }
        
        // Don't retry validation errors
        if (error.response?.status === 400) {
          throw error;
        }
        
        // If this is the last attempt, throw the error
        if (i === attempts - 1) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (i + 1)));
        console.warn(`API request failed, retrying... (${i + 1}/${attempts})`);
      }
    }
  }
  
  // Central request method with retry logic
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers },
      credentials: 'include', // Include cookies for authentication
    };
    
    return this.retryRequest(async () => {
      try {
        const response = await fetch(url, config);
        return this.handleResponse(response);
      } catch (error) {
        console.error('API request failed:', {
          url,
          method: config.method || 'GET',
          error: error.message
        });
        throw error;
      }
    });
  }
  
  // HTTP Methods with proper parameter handling
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, value]) => value !== null && value !== undefined)
    ).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }
  
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
  
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
  
  // File upload with progress tracking
  async uploadFile(endpoint, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Add authorization header
      const token = localStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve({ success: true });
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });
      
      xhr.open('POST', `${this.baseURL}${endpoint}`);
      xhr.send(formData);
    });
  }
  
  // ==================== Enhanced API Methods ====================
  
  // Authentication
  async login(username, password) {
    const response = await this.post('/auth/login', { username, password });
    if (response.success && response.data?.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response;
  }
  
  async logout() {
    try {
      await this.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      if (window.EventBus) {
        window.EventBus.emit('auth:logout');
      }
    }
  }
  
  async verifySession() {
    return this.post('/auth/verify');
  }
  
  async getWebSocketToken() {
    return this.get('/auth/websocket-token');
  }
  
  // Orders
  async getOrders(filters = {}) {
    return this.get('/orders', filters);
  }
  
  async createOrder(orderData) {
    return this.post('/orders', orderData);
  }
  
  async updateOrder(id, updates) {
    return this.put(`/orders/${id}`, updates);
  }
  
  async deleteOrder(id) {
    return this.delete(`/orders/${id}`);
  }
  
  async startProduction(orderId, machineId) {
    return this.post(`/orders/${orderId}/start`, { machine_id: machineId });
  }
  
  async stopProduction(orderId, reason, notes = '') {
    return this.post(`/orders/${orderId}/stop`, { reason, notes });
  }
  
  async pauseProduction(orderId, reason) {
    return this.post(`/orders/${orderId}/pause`, { reason });
  }
  
  async resumeProduction(orderId) {
    return this.post(`/orders/${orderId}/resume`);
  }
  
  async completeProduction(orderId, data = {}) {
    return this.post(`/orders/${orderId}/complete`, data);
  }
  
  // Machines
  async getMachines(environment = null) {
    return this.get('/machines', environment ? { environment } : {});
  }
  
  async createMachine(machineData) {
    return this.post('/machines', machineData);
  }
  
  async updateMachine(id, updates) {
    return this.put(`/machines/${id}`, updates);
  }
  
  async updateMachineStatus(id, status) {
    return this.patch(`/machines/${id}/status`, { status });
  }
  
  async deleteMachine(id) {
    return this.delete(`/machines/${id}`);
  }
  
  async getMachineStats() {
    return this.get('/machines/stats');
  }
  
  // Users
  async getUsers() {
    return this.get('/users');
  }
  
  async createUser(userData) {
    return this.post('/users', userData);
  }
  
  async updateUser(id, updates) {
    return this.put(`/users/${id}`, updates);
  }
  
  // Production Data
  async getProductionStatus() {
    return this.get('/production/status');
  }
  
  async getMachineStatus() {
    return this.get('/machines/status');
  }
  
  async getActiveOrders() {
    return this.get('/orders/active');
  }
  
  async getProductionFloorOverview() {
    return this.get('/production/floor-overview');
  }
  
  // Analytics
  async getAnalyticsSummary(filters = {}) {
    return this.get('/analytics/summary', filters);
  }
  
  async getDowntimeAnalytics(filters = {}) {
    return this.get('/analytics/downtime', filters);
  }
  
  async getDowntimeReports(filters = {}) {
    return this.get('/reports/downtime', filters);
  }

  async getArchivedOrders() {
    return this.get('/orders/archived');
  }

  async getOrder(id) {
    return this.get(`/orders/${id}`);
  }

  async getAnalyticsStops() {
    return this.get('/analytics/stops');
  }

  async getGeneralSettings() {
    return this.get('/settings/general');
  }

  async updateGeneralSettings(settings) {
    return this.put('/settings/general', settings);
  }
  
  // Labor Management
  async getLaborAssignments(date = null) {
    return this.get('/planner/assignments', date ? { date } : {});
  }
  
  async createLaborAssignment(assignmentData) {
    return this.post('/planner/assignments', assignmentData);
  }
  
  async deleteLaborAssignment(id) {
    return this.delete(`/planner/assignments/${id}`);
  }
  
  async getSupervisors(date = null, shift = null) {
    const params = {};
    if (date) params.date = date;
    if (shift) params.shift = shift;
    return this.get('/planner/supervisors', params);
  }
  
  async addSupervisor(supervisorData) {
    return this.post('/planner/supervisors', supervisorData);
  }
  
  async deleteSupervisor(id) {
    return this.delete(`/planner/supervisors/${id}`);
  }
  
  // Environment Management
  async getEnvironments() {
    return this.get('/environments');
  }
  
  // Export/Import
  async exportData(type, filters = {}) {
    const response = await fetch(`${this.baseURL}/export/${type}?${new URLSearchParams(filters)}`, {
      headers: this.getHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    return response.blob();
  }
  
  async uploadOrders(file, onProgress = null) {
    return this.uploadFile('/upload-orders', file, onProgress);
  }
  
  // Health Check
  async checkHealth() {
    return this.get('/health');
  }
}

// Create enhanced instance
const enhancedApiInstance = new EnhancedApiService();

// Attach to window for backward compatibility
window.API = enhancedApiInstance;

// ES6 exports
export { EnhancedApiService };
export const API = enhancedApiInstance;
export default enhancedApiInstance;