import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from './layout-components.jsx';
import API from '../core/api.js';

const SessionManager = ({ onSessionExpiring, onSessionExpired }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  const checkSessionStatus = useCallback(async () => {
    try {
      const response = await API.get('/auth/session-status');
      const remaining = response.timeRemaining || response.data?.timeRemaining;
      
      if (remaining !== undefined) {
        setTimeRemaining(remaining);
        
        // Show warning at 5 minutes (300000ms)
        if (remaining < 300000 && remaining > 0) {
          setShowWarning(true);
          onSessionExpiring?.(remaining);
        } else if (remaining <= 0) {
          setShowWarning(false);
          onSessionExpired?.();
        } else {
          setShowWarning(false);
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
      // If session check fails, assume session is expired
      if (error.response?.status === 401) {
        onSessionExpired?.();
      }
    }
  }, [onSessionExpiring, onSessionExpired]);

  const extendSession = async () => {
    setIsExtending(true);
    try {
      await API.post('/auth/extend-session');
      setShowWarning(false);
      setTimeRemaining(null);
      // Show success feedback
      console.log('Session extended successfully');
    } catch (error) {
      console.error('Failed to extend session:', error);
      // If extension fails, user needs to login again
      if (error.response?.status === 401) {
        onSessionExpired?.();
      }
    } finally {
      setIsExtending(false);
    }
  };

  useEffect(() => {
    // Check session status every minute
    const interval = setInterval(checkSessionStatus, 60000);
    
    // Initial check
    checkSessionStatus();
    
    return () => clearInterval(interval);
  }, [checkSessionStatus]);

  if (!showWarning) return null;

  const minutesRemaining = Math.ceil(timeRemaining / 60000);

  return (
    <div className="fixed top-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg z-50 max-w-sm w-full">
      <div className="flex items-start gap-3">
        <Icon icon="clock" size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-yellow-800">Session Expiring</h4>
          <p className="text-sm text-yellow-700 mt-1">
            Your session will expire in {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''}.
          </p>
          <div className="mt-3 flex gap-2">
            <button 
              onClick={extendSession}
              disabled={isExtending}
              className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation flex items-center justify-center"
            >
              {isExtending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Extending...
                </>
              ) : (
                'Extend Session'
              )}
            </button>
            <button 
              onClick={() => setShowWarning(false)}
              className="px-3 py-2 text-yellow-700 hover:text-yellow-800 text-sm font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Icon icon="x" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for session management
export const useSessionManager = () => {
  const [sessionStatus, setSessionStatus] = useState('active');

  const handleSessionExpiring = useCallback((timeRemaining) => {
    setSessionStatus('expiring');
    console.log(`Session expiring in ${Math.ceil(timeRemaining / 60000)} minutes`);
  }, []);

  const handleSessionExpired = useCallback(() => {
    setSessionStatus('expired');
    console.log('Session expired, redirecting to login...');
    
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    // Redirect to login page
    window.location.href = '/login';
  }, []);

  return {
    sessionStatus,
    handleSessionExpiring,
    handleSessionExpired
  };
};

// Auto-save component to prevent data loss
export const AutoSave = ({ data, saveFunction, interval = 30000 }) => {
  const [lastSaved, setLastSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (!data || !saveFunction) return;

    const autoSaveInterval = setInterval(async () => {
      if (saving) return; // Don't save if already saving

      setSaving(true);
      setSaveError(null);
      
      try {
        await saveFunction(data);
        setLastSaved(new Date());
        console.log('Auto-save completed at', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveError(error);
      } finally {
        setSaving(false);
      }
    }, interval);

    return () => clearInterval(autoSaveInterval);
  }, [data, saveFunction, interval, saving]);

  // Don't render anything if no save function provided
  if (!saveFunction) return null;
  
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      {saving && (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
          <span>Saving...</span>
        </>
      )}
      {lastSaved && !saving && (
        <>
          <Icon icon="check" size={12} className="text-green-500" />
          <span>Saved {lastSaved.toLocaleTimeString()}</span>
        </>
      )}
      {saveError && !saving && (
        <>
          <Icon icon="x" size={12} className="text-red-500" />
          <span className="text-red-500">Save failed</span>
        </>
      )}
    </div>
  );
};

export default SessionManager;