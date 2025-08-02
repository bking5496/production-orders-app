// js/core/api.js - API Service Layer (with Cookie Support)
class ApiService {
  constructor() {
    this.baseURL = window.APP_CONFIG?.API_BASE || '/api';
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
    const headers = this.getHeaders();
    const config = {
      ...options,
      headers,
      // This is the crucial line that enables sending cookies
      credentials: 'include',
    };
    
    // Debug logging for API requests
    console.log('🌐 API Request:', {
      method: config.method || 'GET',
      url,
      hasAuthHeader: !!headers.Authorization,
      authHeader: headers.Authorization ? `${headers.Authorization.substring(0, 20)}...` : 'None'
    });
    
    try {
      const response = await fetch(url, config);
      console.log('📡 API Response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('❌ API request failed:', error);
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
  
  // Debug method to test authentication
  async testAuth() {
    const token = localStorage.getItem('token');
    console.log('🔐 Current token:', token ? `${token.substring(0, 50)}...` : 'No token');
    
    if (!token) {
      console.log('❌ No token found in localStorage');
      return false;
    }
    
    try {
      const response = await this.get('/auth/verify-session');
      console.log('✅ Auth test successful:', response);
      return true;
    } catch (error) {
      console.log('❌ Auth test failed:', error.message);
      return false;
    }
  }
  
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
