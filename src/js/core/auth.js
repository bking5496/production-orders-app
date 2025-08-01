// js/core/auth.js - Authentication Service (with Cookie-based Flow)
import React from 'react';

const AuthContext = React.createContext(null);

const useAuth = () => React.useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  
  // Checks if a valid session cookie exists by calling the backend
  const checkAuth = async () => {
    setLoading(true);
    try {
      const { user: sessionUser } = await window.API.verifySession();
      if (sessionUser) {
        setUser(sessionUser);
        setIsAuthenticated(true);
        // We can still keep user data in localStorage for quick UI access
        localStorage.setItem('user_data', JSON.stringify(sessionUser));
        
        // Connect WebSocket if user is already authenticated (page refresh)
        if (window.EnhancedWebSocketService && !window.EnhancedWebSocketService.isConnected()) {
          try {
            console.log('🔐 User already authenticated - connecting WebSocket');
            await window.EnhancedWebSocketService.connect();
          } catch (error) {
            console.warn('⚠️ WebSocket connection failed for existing session:', error.message);
          }
        }
      }
    } catch (error) {
      // If the API call fails, it means no valid session exists
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user_data');
    } finally {
      setLoading(false);
    }
  };
  
  React.useEffect(() => {
    checkAuth();
    // Listen for logout events triggered by API errors
    const unsubscribe = window.EventBus.on('auth:logout', () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user_data');
    });
    return () => unsubscribe();
  }, []);
  
  // Login now relies on the server to set the cookie
  const login = async (username, password) => {
    const response = await window.API.login(username, password);
    if (response.user) {
      setUser(response.user);
      setIsAuthenticated(true);
      localStorage.setItem('user_data', JSON.stringify(response.user));
      
      // Connect WebSocket after successful login
      if (window.EnhancedWebSocketService) {
        try {
          console.log('🔐 Connecting WebSocket after successful login');
          await window.EnhancedWebSocketService.connect();
        } catch (error) {
          console.warn('⚠️ WebSocket connection failed after login:', error.message);
        }
      }
    }
    return response;
  };
  
  // Logout calls the backend to clear the secure cookie
  const logout = async () => {
    try {
        await window.API.logout();
    } catch (error) {
        console.error('Logout failed:', error);
    } finally {
        // Disconnect WebSocket on logout
        if (window.EnhancedWebSocketService) {
          try {
            console.log('🔌 Disconnecting WebSocket on logout');
            window.EnhancedWebSocketService.disconnect();
          } catch (error) {
            console.warn('⚠️ WebSocket disconnect failed on logout:', error.message);
          }
        }
        
        // Clear client-side state regardless of API call success
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user_data');
    }
  };
  
  const hasRole = (roles) => {
    if (!user) return false;
    const userRoles = Array.isArray(roles) ? roles : [roles];
    return userRoles.includes(user.role);
  };
  
  const value = { user, login, logout, loading, isAuthenticated, hasRole, checkAuth };
  return React.createElement(AuthContext.Provider, { value }, children);
};

// Attach to window for backward compatibility
window.useAuth = useAuth;
window.AuthProvider = AuthProvider;

// ES6 exports
export { AuthContext, useAuth, AuthProvider };
export default { AuthContext, useAuth, AuthProvider };
