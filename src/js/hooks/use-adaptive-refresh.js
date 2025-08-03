import { useState, useEffect, useCallback, useRef } from 'react';
import API from '../core/api.js';

// Adaptive refresh rates based on data criticality (Conservative rates to prevent refresh loops)
const REFRESH_RATES = {
  critical: 30000,   // 30 seconds for critical data (machine status, active production)
  high: 60000,       // 1 minute for high priority (orders, quality metrics)
  normal: 120000,    // 2 minutes for normal data (dashboard overview)
  low: 300000,       // 5 minutes for low priority (analytics, historical data)
  background: 600000 // 10 minutes for background data (user management, settings)
};

export const useAdaptiveRefresh = (endpoint, priority = 'normal', options = {}) => {
  const [data, setData] = useState(options.initialData || null);
  const [isLoading, setIsLoading] = useState(!options.initialData);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  
  const intervalRef = useRef();
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!endpoint) return;

    try {
      if (!isRetry) {
        setIsLoading(true);
      }
      setError(null);
      
      const response = await API.get(endpoint, options.params);
      
      if (mountedRef.current) {
        setData(response.data || response);
        setIsStale(false);
        setLastFetch(new Date());
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}:`, error);
      
      if (mountedRef.current) {
        setError(error);
        setIsStale(true);
        
        // Implement exponential backoff for retries
        const maxRetries = options.maxRetries || 3;
        if (retryCountRef.current < maxRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          retryCountRef.current++;
          
          setTimeout(() => {
            if (mountedRef.current) {
              fetchData(true);
            }
          }, retryDelay);
        }
      }
    } finally {
      if (mountedRef.current && !isRetry) {
        setIsLoading(false);
      }
    }
  }, [endpoint, options.params, options.maxRetries]);

  // Smart refresh rate adjustment based on:
  // 1. Base priority
  // 2. Error state (slower when erroring)
  // 3. Page visibility (slower when hidden)
  // 4. Connection quality
  const getRefreshRate = useCallback(() => {
    let rate = REFRESH_RATES[priority] || REFRESH_RATES.normal;
    
    // Slow down if there are errors
    if (error) {
      rate = Math.min(rate * 2, 300000); // Max 5 minutes
    }
    
    // Slow down if page is hidden
    if (document.hidden) {
      rate = Math.min(rate * 3, 600000); // Max 10 minutes
    }
    
    // Speed up for critical data during production hours
    if (priority === 'critical') {
      const hour = new Date().getHours();
      const isProductionHours = hour >= 6 && hour < 22; // 6 AM to 10 PM
      if (isProductionHours) {
        rate = Math.max(rate * 0.8, 3000); // Min 3 seconds during production
      }
    }
    
    return rate;
  }, [priority, error]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Pause/resume functionality
  const [isPaused, setIsPaused] = useState(false);

  const pause = useCallback(() => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Main effect for setting up refresh interval (DISABLED to prevent rate limiting)
  useEffect(() => {
    if (isPaused) return;

    // Only fetch initial data, disable automatic refresh
    fetchData();
    
    // DISABLED: Automatic refresh causing rate limiting
    // const refreshRate = getRefreshRate();
    // intervalRef.current = setInterval(fetchData, refreshRate);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, isPaused]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isPaused === false) {
        // Page became visible, fetch fresh data
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    isStale,
    error,
    lastFetch,
    refresh,
    pause,
    resume,
    isPaused
  };
};

// Hook for managing multiple data sources with different priorities
export const useMultipleAdaptiveRefresh = (endpoints) => {
  const [globalPaused, setGlobalPaused] = useState(false);
  
  const results = endpoints.map(({ endpoint, priority, options = {} }) => {
    const result = useAdaptiveRefresh(endpoint, priority, {
      ...options,
      // Individual hooks will handle their own pausing, but we can override
    });
    
    // Apply global pause
    useEffect(() => {
      if (globalPaused) {
        result.pause();
      } else {
        result.resume();
      }
    }, [globalPaused, result]);
    
    return {
      endpoint,
      priority,
      ...result
    };
  });

  const pauseAll = useCallback(() => {
    setGlobalPaused(true);
  }, []);

  const resumeAll = useCallback(() => {
    setGlobalPaused(false);
  }, []);

  const refreshAll = useCallback(() => {
    results.forEach(result => result.refresh());
  }, [results]);

  return {
    results,
    pauseAll,
    resumeAll,
    refreshAll,
    globalPaused
  };
};

// Specialized hook for production data
export const useProductionData = () => {
  return useMultipleAdaptiveRefresh([
    { endpoint: '/api/production/status', priority: 'critical' },
    { endpoint: '/api/machines/status', priority: 'critical' },
    { endpoint: '/api/orders/active', priority: 'high' },
    { endpoint: '/api/quality/current', priority: 'high' },
    { endpoint: '/api/performance/kpis', priority: 'normal' }
  ]);
};

// Hook for dashboard data
export const useDashboardData = (userRole = 'operator') => {
  const endpoints = [
    { endpoint: '/api/dashboard/overview', priority: 'normal' },
    { endpoint: '/api/alerts/active', priority: 'critical' }
  ];

  // Add role-specific endpoints
  if (userRole === 'manager' || userRole === 'admin') {
    endpoints.push(
      { endpoint: '/api/analytics/summary', priority: 'low' },
      { endpoint: '/api/performance/trends', priority: 'background' }
    );
  }

  return useMultipleAdaptiveRefresh(endpoints);
};

export default useAdaptiveRefresh;