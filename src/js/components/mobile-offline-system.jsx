import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  WifiOff, Wifi, AlertTriangle, CheckCircle, RefreshCw, 
  Upload, Download, Database, Clock, Sync
} from 'lucide-react';

/**
 * Offline-Capable Interface System for Manufacturing
 * Ensures production continuity even when connectivity is poor
 * Features local storage, sync queues, and optimistic updates
 */

// Local Storage Manager for Offline Data
class OfflineStorageManager {
  constructor() {
    this.dbName = 'ProductionOfflineDB';
    this.version = 1;
    this.db = null;
    this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Orders store
        if (!db.objectStoreNames.contains('orders')) {
          const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
          ordersStore.createIndex('status', 'status', { unique: false });
          ordersStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('priority', 'priority', { unique: false });
        }
        
        // Production data store
        if (!db.objectStoreNames.contains('productionData')) {
          const productionStore = db.createObjectStore('productionData', { keyPath: 'id', autoIncrement: true });
          productionStore.createIndex('orderId', 'orderId', { unique: false });
          productionStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async storeOrder(order) {
    const transaction = this.db.transaction(['orders'], 'readwrite');
    const store = transaction.objectStore('orders');
    await store.put({ ...order, lastModified: Date.now() });
  }

  async getOrders() {
    const transaction = this.db.transaction(['orders'], 'readonly');
    const store = transaction.objectStore('orders');
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
  }

  async addToSyncQueue(operation) {
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    const syncItem = {
      ...operation,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: 3
    };
    
    await store.add(syncItem);
  }

  async getSyncQueue() {
    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
  }

  async removeFromSyncQueue(id) {
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    await store.delete(id);
  }

  async storeProductionData(data) {
    const transaction = this.db.transaction(['productionData'], 'readwrite');
    const store = transaction.objectStore('productionData');
    await store.add({ ...data, timestamp: Date.now() });
  }
}

// Offline Status Hook
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnline, setLastOnline] = useState(Date.now());
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, error

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnline(Date.now());
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

  return { isOnline, lastOnline, syncStatus, setSyncStatus };
};

// Offline-First Data Hook
export const useOfflineData = (endpoint, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  
  const storageManager = useRef(new OfflineStorageManager());
  const { isOnline } = useOfflineStatus();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (isOnline) {
        // Try to fetch from API first
        const response = await fetch(endpoint);
        if (response.ok) {
          const freshData = await response.json();
          setData(freshData);
          setIsStale(false);
          
          // Store in local storage
          if (endpoint.includes('orders')) {
            await storageManager.current.storeOrder(freshData);
          }
          
          return freshData;
        }
      }

      // Fallback to local storage
      if (endpoint.includes('orders')) {
        const localData = await storageManager.current.getOrders();
        if (localData.length > 0) {
          setData(localData);
          setIsStale(!isOnline);
          return localData;
        }
      }

      throw new Error('No data available offline');
    } catch (err) {
      setError(err.message);
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, isOnline]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return { data, loading, error, isStale, refetch: fetchData };
};

// Offline Sync Manager Component
export const OfflineSyncManager = ({ onSyncComplete, onSyncError }) => {
  const [syncQueue, setSyncQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const { isOnline, syncStatus, setSyncStatus } = useOfflineStatus();
  
  const storageManager = useRef(new OfflineStorageManager());

  useEffect(() => {
    loadSyncQueue();
  }, []);

  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !syncing) {
      processSyncQueue();
    }
  }, [isOnline, syncQueue.length, syncing]);

  const loadSyncQueue = async () => {
    try {
      const queue = await storageManager.current.getSyncQueue();
      setSyncQueue(queue);
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  };

  const processSyncQueue = async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);
    setSyncStatus('syncing');

    try {
      const queue = await storageManager.current.getSyncQueue();
      
      for (const item of queue) {
        if (item.attempts >= item.maxAttempts) {
          console.warn('Max sync attempts reached for item:', item);
          await storageManager.current.removeFromSyncQueue(item.id);
          continue;
        }

        try {
          await syncItem(item);
          await storageManager.current.removeFromSyncQueue(item.id);
        } catch (error) {
          console.error('Sync failed for item:', item, error);
          // Increment attempt count
          item.attempts++;
          // Could implement exponential backoff here
        }
      }

      setSyncStatus('idle');
      onSyncComplete?.();
    } catch (error) {
      setSyncStatus('error');
      onSyncError?.(error);
    } finally {
      setSyncing(false);
      await loadSyncQueue();
    }
  };

  const syncItem = async (item) => {
    const { operation, endpoint, data, method = 'POST' } = item;

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    return response.json();
  };

  return null; // This is a background service component
};

// Offline-Capable Production Control
export const OfflineProductionControl = ({ order, onUpdate }) => {
  const [localQuantity, setLocalQuantity] = useState(order.actual_quantity || 0);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const { isOnline } = useOfflineStatus();
  
  const storageManager = useRef(new OfflineStorageManager());

  const updateQuantity = async (newQuantity) => {
    // Optimistic update
    setLocalQuantity(newQuantity);
    
    const updateData = {
      orderId: order.id,
      quantity: newQuantity,
      timestamp: Date.now(),
      operator: localStorage.getItem('userId')
    };

    // Store locally immediately
    await storageManager.current.storeProductionData(updateData);

    if (isOnline) {
      try {
        // Try to sync immediately
        const response = await fetch(`/api/orders/${order.id}/quantity`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ actual_quantity: newQuantity })
        });

        if (response.ok) {
          onUpdate?.();
        } else {
          throw new Error('Sync failed');
        }
      } catch (error) {
        // Add to sync queue for later
        await storageManager.current.addToSyncQueue({
          operation: 'updateQuantity',
          endpoint: `/api/orders/${order.id}/quantity`,
          method: 'PATCH',
          data: { actual_quantity: newQuantity },
          priority: 'high'
        });
        
        setPendingUpdates(prev => [...prev, updateData]);
      }
    } else {
      // Add to sync queue
      await storageManager.current.addToSyncQueue({
        operation: 'updateQuantity',
        endpoint: `/api/orders/${order.id}/quantity`,
        method: 'PATCH',
        data: { actual_quantity: newQuantity },
        priority: 'high'
      });
      
      setPendingUpdates(prev => [...prev, updateData]);
    }
  };

  const recordStop = async (reason) => {
    const stopData = {
      orderId: order.id,
      reason,
      timestamp: Date.now(),
      operator: localStorage.getItem('userId')
    };

    // Store locally
    await storageManager.current.storeProductionData(stopData);

    if (isOnline) {
      try {
        await fetch(`/api/orders/${order.id}/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ reason })
        });
        
        onUpdate?.();
      } catch (error) {
        await storageManager.current.addToSyncQueue({
          operation: 'recordStop',
          endpoint: `/api/orders/${order.id}/stop`,
          method: 'POST',
          data: { reason },
          priority: 'critical'
        });
      }
    } else {
      await storageManager.current.addToSyncQueue({
        operation: 'recordStop',
        endpoint: `/api/orders/${order.id}/stop`,
        method: 'POST',
        data: { reason },
        priority: 'critical'
      });
    }
  };

  return (
    <div className="offline-production-control">
      {/* Offline Status Indicator */}
      <OfflineStatusBanner />
      
      {/* Quantity Update */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Current Quantity
          {pendingUpdates.length > 0 && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              {pendingUpdates.length} pending sync
            </span>
          )}
        </label>
        
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={localQuantity}
            onChange={(e) => updateQuantity(parseInt(e.target.value) || 0)}
            className="flex-1 h-12 px-4 text-lg font-mono border-2 border-gray-300 rounded-lg focus:border-blue-500"
            min="0"
            max={order.quantity}
          />
          <span className="text-lg text-gray-600">/ {order.quantity}</span>
        </div>
      </div>

      {/* Stop Production */}
      <OfflineStopButton onStop={recordStop} />
    </div>
  );
};

// Offline Status Banner
export const OfflineStatusBanner = () => {
  const { isOnline, lastOnline, syncStatus } = useOfflineStatus();
  const [showDetails, setShowDetails] = useState(false);

  if (isOnline && syncStatus === 'idle') return null;

  const getStatusMessage = () => {
    if (!isOnline) {
      const minutesOffline = Math.floor((Date.now() - lastOnline) / 60000);
      return `Offline for ${minutesOffline}m - Data saved locally`;
    }
    
    if (syncStatus === 'syncing') return 'Syncing data...';
    if (syncStatus === 'error') return 'Sync error - Data saved locally';
    
    return 'Online';
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-yellow-600';
    if (syncStatus === 'syncing') return 'bg-blue-600';
    if (syncStatus === 'error') return 'bg-red-600';
    return 'bg-green-600';
  };

  return (
    <div className={`${getStatusColor()} text-white p-3 rounded-lg mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            syncStatus === 'syncing' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4" />
            )
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          <span className="font-medium">{getStatusMessage()}</span>
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm underline"
        >
          {showDetails ? 'Hide' : 'Details'}
        </button>
      </div>
      
      {showDetails && (
        <div className="mt-3 p-3 bg-black bg-opacity-20 rounded text-sm">
          <div className="space-y-1">
            <div>Status: {isOnline ? 'Connected' : 'Offline'}</div>
            <div>Last sync: {new Date(lastOnline).toLocaleTimeString()}</div>
            <div>Local storage: Active</div>
            {!isOnline && (
              <div className="text-yellow-200">
                ⚠ Changes will sync when connection is restored
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Offline-Capable Stop Button
const OfflineStopButton = ({ onStop }) => {
  const [showReasons, setShowReasons] = useState(false);
  const { isOnline } = useOfflineStatus();

  const reasons = [
    { id: 'material_shortage', label: 'Material Shortage', priority: 'high' },
    { id: 'operator_break', label: 'Break Time', priority: 'normal' },
    { id: 'machine_issue', label: 'Machine Issue', priority: 'critical' },
    { id: 'quality_issue', label: 'Quality Issue', priority: 'high' }
  ];

  const handleStop = (reason) => {
    onStop(reason);
    setShowReasons(false);
  };

  return (
    <div className="offline-stop-button">
      {!showReasons ? (
        <button
          onClick={() => setShowReasons(true)}
          className="w-full h-14 bg-red-600 text-white font-bold rounded-lg flex items-center justify-center gap-3 hover:bg-red-700 active:scale-95 transition-all"
        >
          <Square className="w-6 h-6" />
          Stop Production
          {!isOnline && (
            <div className="bg-yellow-500 text-yellow-900 px-2 py-1 rounded text-xs font-normal">
              Offline
            </div>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Select stop reason:</p>
          {reasons.map(reason => (
            <button
              key={reason.id}
              onClick={() => handleStop(reason.id)}
              className="w-full h-12 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 active:scale-95 transition-all text-left px-4"
            >
              {reason.label}
              {!isOnline && (
                <span className="float-right text-xs text-yellow-600">
                  Will sync
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => setShowReasons(false)}
            className="w-full h-10 bg-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default OfflineStorageManager;