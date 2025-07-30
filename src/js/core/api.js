// js/core/api.js - API Service Layer (with Cookie Support)
class ApiService {
  constructor() {
    this.baseURL = window.APP_CONFIG?.API_BASE || '/api';
  }
  
  getHeaders() {
    return { 'Content-Type': 'application/json' };
  }
  
  async handleResponse(response) {
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Broadcast a logout event if unauthorized
        if (window.EventBus) {
          window.EventBus.emit('auth:logout');
        }
        throw new Error('Session expired or unauthorized. Please login again.');
      }
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      
      // Create error with response structure for better error handling
      const error = new Error(errorData.error || errorData.message || 'Request failed');
      error.response = {
        status: response.status,
        data: errorData
      };
      throw error;
    }
    // Handle responses that might not have a JSON body
    if (response.headers.get('content-length') === '0') {
        return null;
    }
    return response.json();
  }
  
  // Central request method with cookie support
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders(),
      // This is the crucial line that enables sending cookies
      credentials: 'include',
    };
    try {
      const response = await fetch(url, config);
      return this.handleResponse(response);
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  // --- API Methods ---
  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }
  
  post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
  
  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
  
  // --- Auth Endpoints ---
  login(username, password) {
    return this.post('/auth/login', { username, password });
  }
  
  logout() {
    return this.post('/auth/logout');
  }
  
  verifySession() {
    return this.get('/auth/verify-session');
  }
  
  // --- Other Endpoints (Examples) ---
  getUsers() { return this.get('/users'); }
  getMachines() { return this.get('/machines'); }
  getOrders() { return this.get('/orders'); }
  // ... include all other specific methods from your original file
}

// Create instance
const apiInstance = new ApiService();

// Attach to window for backward compatibility
window.API = apiInstance;

// ES6 exports
export { ApiService };
export const API = apiInstance;
export default apiInstance;
