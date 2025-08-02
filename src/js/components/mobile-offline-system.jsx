import React, { useState, useEffect, useContext, createContext } from 'react';
import { WifiOff, Wifi, Upload, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import API from '../core/api';

/**
 * Mobile Offline System for Production Tracking
 * Handles offline data storage and synchronization for manufacturing environments
 */

// Offline Context
const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};

/**
 * Offline Provider Component
 */
export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState([]);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    // Load pending actions from localStorage on startup
    loadPendingActions();
    
    // Set up online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingActions = () => {
    try {
      const stored = localStorage.getItem('production_offline_actions');
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load offline actions:', error);
    }
  };

  const savePendingActions = (actions) => {
    try {
      localStorage.setItem('production_offline_actions', JSON.stringify(actions));
    } catch (error) {
      console.error('Failed to save offline actions:', error);
    }
  };

  /**
   * Add an action to the offline queue
   */
  const addOfflineAction = (action) => {
    const offlineAction = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: 3,
      ...action
    };

    const newActions = [...pendingActions, offlineAction];
    setPendingActions(newActions);
    savePendingActions(newActions);

    // Try to sync immediately if online
    if (isOnline) {
      syncPendingActions();
    }

    return offlineAction.id;
  };

  /**
   * Sync pending actions when coming back online
   */
  const syncPendingActions = async () => {
    if (syncInProgress || pendingActions.length === 0) return;

    setSyncInProgress(true);
    
    try {
      const successfulActions = [];
      const failedActions = [];

      for (const action of pendingActions) {
        try {
          await executeOfflineAction(action);
          successfulActions.push(action.id);
        } catch (error) {
          console.error('Failed to sync action:', error);
          action.retries += 1;
          if (action.retries < action.maxRetries) {
            failedActions.push(action);
          }
        }
      }

      // Remove successful actions and keep failed ones for retry
      const remainingActions = pendingActions.filter(action => 
        !successfulActions.includes(action.id)
      );
      
      setPendingActions(remainingActions);
      savePendingActions(remainingActions);
      setLastSync(new Date().toISOString());

    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      setSyncInProgress(false);
    }
  };

  /**
   * Execute an offline action
   */
  const executeOfflineAction = async (action) => {
    switch (action.type) {
      case 'update_production_quantity':
        return await API.patch(`/orders/${action.orderId}/quantity`, {
          actual_quantity: action.quantity,
          timestamp: action.timestamp
        });
        
      case 'stop_production':
        return await API.post(`/orders/${action.orderId}/stop`, {
          reason: action.reason,
          notes: action.notes,
          timestamp: action.timestamp
        });
        
      case 'start_production':
        return await API.post(`/orders/${action.orderId}/start`, {
          machine_id: action.machineId,
          timestamp: action.timestamp
        });
        
      case 'complete_production':
        return await API.post(`/orders/${action.orderId}/complete`, {
          actual_quantity: action.actualQuantity,
          notes: action.notes,
          timestamp: action.timestamp
        });
        
      case 'update_machine_status':
        return await API.patch(`/machines/${action.machineId}/status`, {
          status: action.status,
          reason: action.reason,
          timestamp: action.timestamp
        });
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  };

  /**
   * Clear all pending actions (use with caution)
   */
  const clearPendingActions = () => {
    setPendingActions([]);
    localStorage.removeItem('production_offline_actions');
  };

  /**
   * Manual sync trigger
   */
  const manualSync = () => {
    if (isOnline) {
      syncPendingActions();
    }
  };

  const value = {
    isOnline,
    pendingActions,
    syncInProgress,
    lastSync,
    addOfflineAction,
    syncPendingActions,
    clearPendingActions,
    manualSync
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

/**
 * Offline Status Banner Component
 */
export const OfflineStatusBanner = () => {
  const { isOnline, pendingActions, syncInProgress, manualSync } = useOffline();

  if (isOnline && pendingActions.length === 0) {
    return null;
  }

  return (
    <div className={`sticky top-0 z-40 px-4 py-3 text-sm font-medium ${
      isOnline ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {isOnline ? (
            <Wifi className="w-4 h-4 mr-2" />
          ) : (
            <WifiOff className="w-4 h-4 mr-2" />
          )}
          <span>
            {isOnline 
              ? `${pendingActions.length} actions pending sync`
              : 'Working offline - data will sync when connected'
            }
          </span>
        </div>
        
        {isOnline && pendingActions.length > 0 && (
          <button
            onClick={manualSync}
            disabled={syncInProgress}
            className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
          >
            {syncInProgress ? (
              <>
                <Upload className="w-3 h-3 mr-1 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Upload className="w-3 h-3 mr-1" />
                Sync Now
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Offline-capable production action hooks
 */
export const useOfflineProductionActions = () => {
  const { addOfflineAction, isOnline } = useOffline();

  const updateProductionQuantity = async (orderId, quantity) => {
    if (isOnline) {
      // Try online first
      try {
        return await API.patch(`/orders/${orderId}/quantity`, { actual_quantity: quantity });
      } catch (error) {
        // If failed, add to offline queue
        addOfflineAction({
          type: 'update_production_quantity',
          orderId,
          quantity
        });
        throw error;
      }
    } else {
      // Add to offline queue
      return addOfflineAction({
        type: 'update_production_quantity',
        orderId,
        quantity
      });
    }
  };

  const stopProduction = async (orderId, reason, notes = '') => {
    if (isOnline) {
      try {
        return await API.post(`/orders/${orderId}/stop`, { reason, notes });
      } catch (error) {
        addOfflineAction({
          type: 'stop_production',
          orderId,
          reason,
          notes
        });
        throw error;
      }
    } else {
      return addOfflineAction({
        type: 'stop_production',
        orderId,
        reason,
        notes
      });
    }
  };

  const startProduction = async (orderId, machineId) => {
    if (isOnline) {
      try {
        return await API.post(`/orders/${orderId}/start`, { machine_id: machineId });
      } catch (error) {
        addOfflineAction({
          type: 'start_production',
          orderId,
          machineId
        });
        throw error;
      }
    } else {
      return addOfflineAction({
        type: 'start_production',
        orderId,
        machineId
      });
    }
  };

  const completeProduction = async (orderId, actualQuantity, notes = '') => {
    if (isOnline) {
      try {
        return await API.post(`/orders/${orderId}/complete`, { 
          actual_quantity: actualQuantity, 
          notes 
        });
      } catch (error) {
        addOfflineAction({
          type: 'complete_production',
          orderId,
          actualQuantity,
          notes
        });
        throw error;
      }
    } else {
      return addOfflineAction({
        type: 'complete_production',
        orderId,
        actualQuantity,
        notes
      });
    }
  };

  const updateMachineStatus = async (machineId, status, reason = '') => {
    if (isOnline) {
      try {
        return await API.patch(`/machines/${machineId}/status`, { status, reason });
      } catch (error) {
        addOfflineAction({
          type: 'update_machine_status',
          machineId,
          status,
          reason
        });
        throw error;
      }
    } else {
      return addOfflineAction({
        type: 'update_machine_status',
        machineId,
        status,
        reason
      });
    }
  };

  return {
    updateProductionQuantity,
    stopProduction,
    startProduction,
    completeProduction,
    updateMachineStatus,
    isOnline
  };
};

/**
 * Offline Actions List Component
 */
export const OfflineActionsList = ({ onClose }) => {
  const { pendingActions, clearPendingActions, syncInProgress } = useOffline();

  const formatActionDescription = (action) => {
    switch (action.type) {
      case 'update_production_quantity':
        return `Update quantity to ${action.quantity} for order ${action.orderId}`;
      case 'stop_production':
        return `Stop production for order ${action.orderId} (${action.reason})`;
      case 'start_production':
        return `Start production for order ${action.orderId}`;
      case 'complete_production':
        return `Complete order ${action.orderId} with ${action.actualQuantity} units`;
      case 'update_machine_status':
        return `Update machine ${action.machineId} status to ${action.status}`;
      default:
        return 'Unknown action';
    }
  };

  const getActionIcon = (action) => {
    switch (action.type) {
      case 'update_production_quantity':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'stop_production':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'start_production':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'complete_production':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'update_machine_status':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="sticky top-0 bg-gray-900 text-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Offline Actions ({pendingActions.length})</h2>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            ×
          </button>
        </div>
      </div>

      <div className="p-4">
        {pendingActions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p>No pending offline actions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingActions.map(action => (
              <div key={action.id} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    {getActionIcon(action)}
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {formatActionDescription(action)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(action.timestamp).toLocaleString()}
                      </p>
                      {action.retries > 0 && (
                        <p className="text-xs text-red-600">
                          Failed {action.retries} time(s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <button
                onClick={clearPendingActions}
                disabled={syncInProgress}
                className="w-full px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                Clear All Actions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};