// Dynamic Configuration Service
// Loads configuration from database and provides reactive updates

import API from './api.js';
import { useWebSocketEvent } from './websocket-hooks.js';

class DynamicConfigService {
  constructor() {
    this.config = {};
    this.listeners = new Set();
    this.loading = false;
    this.lastUpdated = null;
  }

  // Load configuration from server
  async load() {
    if (this.loading) return this.config;
    
    try {
      this.loading = true;
      const response = await API.get('/config/public');
      this.config = this.mergeWithDefaults(response);
      this.lastUpdated = new Date();
      this.notifyListeners();
      return this.config;
    } catch (error) {
      console.error('Failed to load dynamic configuration:', error);
      // Fall back to static configuration
      this.config = this.getStaticFallback();
      return this.config;
    } finally {
      this.loading = false;
    }
  }

  // Get configuration value by path (e.g., 'order_management.order_statuses')
  get(path, defaultValue = null) {
    const parts = path.split('.');
    let current = this.config;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  // Get array configuration (ensures it's always an array)
  getArray(path, defaultValue = []) {
    const value = this.get(path, defaultValue);
    return Array.isArray(value) ? value : defaultValue;
  }

  // Get object configuration (ensures it's always an object)
  getObject(path, defaultValue = {}) {
    const value = this.get(path, defaultValue);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : defaultValue;
  }

  // Subscribe to configuration changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of configuration changes
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('Error in configuration listener:', error);
      }
    });
  }

  // Handle real-time configuration updates
  handleConfigUpdate(data) {
    console.log('Configuration updated:', data);
    
    // Update local configuration
    if (data.category && data.key) {
      if (!this.config[data.category]) {
        this.config[data.category] = {};
      }
      this.config[data.category][data.key] = data.new_value;
      this.lastUpdated = new Date();
      this.notifyListeners();
    }
  }

  // Merge server configuration with static defaults
  mergeWithDefaults(serverConfig) {
    const defaults = this.getStaticFallback();
    const merged = { ...defaults };

    // Merge server configuration over defaults
    Object.keys(serverConfig).forEach(category => {
      if (!merged[category]) {
        merged[category] = {};
      }
      merged[category] = { ...merged[category], ...serverConfig[category] };
    });

    return merged;
  }

  // Static fallback configuration (from app-config.js)
  getStaticFallback() {
    return {
      order_management: {
        order_statuses: ['pending', 'in_progress', 'stopped', 'completed'],
        order_priorities: ['low', 'normal', 'high', 'urgent'],
        order_status_transitions: {
          pending: ['in_progress'],
          in_progress: ['stopped', 'completed'],
          stopped: ['in_progress', 'completed'],
          completed: []
        },
        min_order_quantity: 1,
        max_order_quantity: 999999
      },
      machine_management: {
        machine_statuses: ['available', 'in_use', 'maintenance', 'offline', 'paused'],
        machine_types: ['Processing Unit', 'Packaging Equipment', 'Production Line'],
        environments: ['production', 'packaging'],
        machine_status_transitions: {
          available: ['in_use', 'maintenance', 'offline'],
          in_use: ['paused', 'available', 'offline'],
          paused: ['in_use', 'available'],
          maintenance: ['available', 'offline'],
          offline: ['available', 'maintenance']
        },
        max_concurrent_orders: 1
      },
      user_roles: {
        user_roles: ['admin', 'supervisor', 'operator', 'viewer'],
        role_permissions: {
          admin: ['createOrder', 'updateOrder', 'deleteOrder', 'viewOrders', 'startProduction', 'stopProduction', 'completeOrder', 'manageMachines', 'viewMachines', 'manageUsers', 'viewUsers', 'viewAnalytics', 'exportData', 'manageSettings'],
          supervisor: ['createOrder', 'updateOrder', 'deleteOrder', 'viewOrders', 'startProduction', 'stopProduction', 'completeOrder', 'viewMachines', 'viewAnalytics', 'exportData'],
          operator: ['viewOrders', 'startProduction', 'stopProduction', 'completeOrder', 'viewMachines'],
          viewer: ['viewOrders', 'viewMachines']
        }
      },
      production_workflow: {
        stop_reasons: [
          { value: 'equipment_breakdown', label: 'Equipment Breakdown', category: 'mechanical' },
          { value: 'material_shortage', label: 'Material Shortage', category: 'supply' },
          { value: 'maintenance', label: 'Planned Maintenance', category: 'mechanical' },
          { value: 'quality_issue', label: 'Quality Issue', category: 'quality' },
          { value: 'safety_concern', label: 'Safety Concern', category: 'safety' },
          { value: 'operator_break', label: 'Operator Break', category: 'operational' },
          { value: 'power_outage', label: 'Power Outage', category: 'infrastructure' },
          { value: 'shift_change', label: 'Shift Change', category: 'operational' },
          { value: 'other', label: 'Other', category: 'other' }
        ],
        waste_types: ['Raw Material', 'Packaging Material', 'Finished Product', 'Energy', 'Water', 'Other'],
        quality_checkpoints: ['Material Inspection', 'Final Inspection']
      }
    };
  }

  // Refresh configuration from server
  async refresh() {
    return this.load();
  }

  // Check if configuration is loaded
  isLoaded() {
    return Object.keys(this.config).length > 0;
  }

  // Get last updated timestamp
  getLastUpdated() {
    return this.lastUpdated;
  }
}

// Create singleton instance
const dynamicConfig = new DynamicConfigService();

// React hook for using dynamic configuration
export function useDynamicConfig(path = null, defaultValue = null) {
  const [config, setConfig] = React.useState(() => 
    path ? dynamicConfig.get(path, defaultValue) : dynamicConfig.config
  );
  const [loading, setLoading] = React.useState(!dynamicConfig.isLoaded());

  // Load configuration on mount
  React.useEffect(() => {
    if (!dynamicConfig.isLoaded()) {
      setLoading(true);
      dynamicConfig.load().then(() => {
        setConfig(path ? dynamicConfig.get(path, defaultValue) : dynamicConfig.config);
        setLoading(false);
      });
    }
  }, [path, defaultValue]);

  // Subscribe to configuration changes
  React.useEffect(() => {
    const unsubscribe = dynamicConfig.subscribe((newConfig) => {
      setConfig(path ? dynamicConfig.get(path, defaultValue) : newConfig);
    });
    return unsubscribe;
  }, [path, defaultValue]);

  // Listen for real-time configuration updates
  useWebSocketEvent('configuration_updated', (data) => {
    dynamicConfig.handleConfigUpdate(data);
  }, []);

  return { config, loading, refresh: () => dynamicConfig.refresh() };
}

// React hook for getting specific configuration arrays
export function useConfigArray(path, defaultValue = []) {
  const { config, loading } = useDynamicConfig(path, defaultValue);
  return { items: Array.isArray(config) ? config : defaultValue, loading };
}

// React hook for getting specific configuration objects
export function useConfigObject(path, defaultValue = {}) {
  const { config, loading } = useDynamicConfig(path, defaultValue);
  return { 
    object: config && typeof config === 'object' && !Array.isArray(config) ? config : defaultValue, 
    loading 
  };
}

// Utility functions for common configuration access patterns
export const ConfigUtils = {
  // Get order statuses
  getOrderStatuses: () => dynamicConfig.getArray('order_management.order_statuses'),
  
  // Get machine statuses
  getMachineStatuses: () => dynamicConfig.getArray('machine_management.machine_statuses'),
  
  // Get environments
  getEnvironments: () => dynamicConfig.getArray('machine_management.environments'),
  
  // Get stop reasons
  getStopReasons: () => dynamicConfig.getArray('production_workflow.stop_reasons'),
  
  // Get user roles
  getUserRoles: () => dynamicConfig.getArray('user_roles.user_roles'),
  
  // Check if status transition is valid
  isValidStatusTransition: (currentStatus, newStatus, type = 'order') => {
    const transitions = type === 'order' 
      ? dynamicConfig.getObject('order_management.order_status_transitions')
      : dynamicConfig.getObject('machine_management.machine_status_transitions');
    
    return transitions[currentStatus]?.includes(newStatus) || false;
  },
  
  // Get user permissions for role
  getRolePermissions: (role) => {
    const permissions = dynamicConfig.getObject('user_roles.role_permissions');
    return permissions[role] || [];
  },
  
  // Check if user has permission
  hasPermission: (userRole, permission) => {
    const permissions = ConfigUtils.getRolePermissions(userRole);
    return permissions.includes(permission);
  }
};

export default dynamicConfig;