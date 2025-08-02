import React, { useState, useEffect } from 'react';
import { 
  Monitor, Wrench, Power, AlertTriangle, CheckCircle, 
  Clock, RefreshCw, X, Zap, Settings
} from 'lucide-react';
import API from '../core/api';
import { useAuth } from '../core/auth';
import { TouchButton, useDeviceDetection } from './mobile-responsive-utils.jsx';

/**
 * Mobile Machine Status Update Interface
 * Quick one-tap status changes for operators on the production floor
 */
export default function MobileMachineStatus({ machineId, onClose, onStatusUpdated }) {
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState(null);
  
  const { user } = useAuth();
  const { isMobile } = useDeviceDetection();

  useEffect(() => {
    if (machineId) {
      loadMachine();
    }
  }, [machineId]);

  const loadMachine = async () => {
    try {
      const machines = await API.get('/machines');
      const machineData = machines.find(m => m.id === machineId);
      setMachine(machineData);
    } catch (error) {
      console.error('Failed to load machine:', error);
      showNotification('Failed to load machine data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateMachineStatus = async (newStatus, reason = null) => {
    setUpdating(true);
    try {
      await API.patch(`/machines/${machineId}/status`, { 
        status: newStatus,
        reason: reason,
        updated_by: user.id
      });
      
      setMachine(prev => ({ ...prev, status: newStatus }));
      showNotification(`Machine status updated to ${newStatus.toUpperCase()}`, 'success');
      onStatusUpdated && onStatusUpdated(machineId, newStatus);
      
      // Auto-close after successful update
      setTimeout(() => onClose(), 1500);
      
    } catch (error) {
      console.error('Failed to update machine status:', error);
      showNotification(error.message || 'Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) {
    return <MobileLoadingScreen />;
  }

  if (!machine) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Machine Not Found</h2>
          <TouchButton onClick={onClose} variant="outline" size="medium">
            Close
          </TouchButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-machine-status fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 text-white shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <Monitor className="w-6 h-6 mr-3" />
            <div>
              <h1 className="text-lg font-bold">{machine.name}</h1>
              <p className="text-sm text-gray-300">{machine.type} • {machine.environment}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Current Status Display */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-white">
        <CurrentStatusCard machine={machine} />
      </div>

      {/* Status Update Options */}
      <div className="p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Update Machine Status</h2>
        
        <StatusUpdateGrid 
          currentStatus={machine.status}
          onStatusUpdate={updateMachineStatus}
          updating={updating}
        />
      </div>

      {/* Quick Actions */}
      <div className="p-6 bg-gray-50 border-t">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <QuickActionsGrid machineId={machineId} />
      </div>

      {/* Floating Notification */}
      {notification && (
        <FloatingNotification 
          message={notification.message} 
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

/**
 * Current Status Display Card
 */
const CurrentStatusCard = ({ machine }) => {
  const statusConfig = {
    available: { icon: CheckCircle, color: 'green', bg: 'bg-green-100', text: 'Ready for Production' },
    in_use: { icon: Zap, color: 'blue', bg: 'bg-blue-100', text: 'Currently Running' },
    maintenance: { icon: Wrench, color: 'yellow', bg: 'bg-yellow-100', text: 'Under Maintenance' },
    offline: { icon: Power, color: 'red', bg: 'bg-red-100', text: 'Offline' }
  };

  const config = statusConfig[machine.status] || statusConfig.offline;
  const Icon = config.icon;

  return (
    <div className={`${config.bg} rounded-lg p-6 text-center`}>
      <Icon className={`w-16 h-16 text-${config.color}-600 mx-auto mb-4`} />
      <h3 className="text-2xl font-bold text-gray-900 mb-2">
        {machine.status.replace('_', ' ').toUpperCase()}
      </h3>
      <p className="text-lg text-gray-700">{config.text}</p>
      <div className="mt-4 text-sm text-gray-600">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

/**
 * Status Update Grid with Large Touch Targets
 */
const StatusUpdateGrid = ({ currentStatus, onStatusUpdate, updating }) => {
  const statusOptions = [
    {
      status: 'available',
      label: 'Available',
      icon: CheckCircle,
      color: 'green',
      description: 'Ready for production',
      disabled: currentStatus === 'available'
    },
    {
      status: 'maintenance',
      label: 'Maintenance',
      icon: Wrench,
      color: 'yellow',
      description: 'Under maintenance',
      disabled: currentStatus === 'maintenance'
    },
    {
      status: 'offline',
      label: 'Offline',
      icon: Power,
      color: 'red',
      description: 'Machine offline',
      disabled: currentStatus === 'offline'
    }
  ];

  // Don't show "in_use" as an option - that's controlled by production orders
  const filteredOptions = statusOptions.filter(option => 
    !(currentStatus === 'in_use' && option.status === 'available')
  );

  return (
    <div className="grid grid-cols-1 gap-4">
      {filteredOptions.map(option => {
        const Icon = option.icon;
        return (
          <TouchButton
            key={option.status}
            onClick={() => onStatusUpdate(option.status)}
            disabled={option.disabled || updating}
            variant={option.disabled ? 'outline' : 'primary'}
            size="large"
            className={`h-20 justify-start ${option.disabled ? 'opacity-50' : ''}`}
          >
            <Icon className={`w-8 h-8 mr-4 text-${option.color}-600`} />
            <div className="text-left">
              <div className="text-lg font-bold">{option.label}</div>
              <div className="text-sm opacity-75">{option.description}</div>
            </div>
          </TouchButton>
        );
      })}
      
      {/* Emergency Stop for In-Use Machines */}
      {currentStatus === 'in_use' && (
        <TouchButton
          onClick={() => onStatusUpdate('offline', 'emergency_stop')}
          disabled={updating}
          variant="danger"
          size="large"
          className="h-20 justify-start animate-pulse border-4 border-red-400"
        >
          <AlertTriangle className="w-8 h-8 mr-4 text-white" />
          <div className="text-left">
            <div className="text-lg font-bold">🚨 EMERGENCY STOP</div>
            <div className="text-sm opacity-75">Immediate shutdown</div>
          </div>
        </TouchButton>
      )}
    </div>
  );
};

/**
 * Quick Actions Grid
 */
const QuickActionsGrid = ({ machineId }) => {
  const actions = [
    {
      label: 'View Details',
      icon: Monitor,
      color: 'blue',
      action: () => console.log('View machine details')
    },
    {
      label: 'Report Issue',
      icon: AlertTriangle,
      color: 'red',
      action: () => console.log('Report machine issue')
    },
    {
      label: 'Maintenance Log',
      icon: Settings,
      color: 'gray',
      action: () => console.log('View maintenance log')
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-3">
      {actions.map(action => {
        const Icon = action.icon;
        return (
          <TouchButton
            key={action.label}
            onClick={action.action}
            variant="outline"
            size="medium"
            className="justify-start h-14"
          >
            <Icon className={`w-5 h-5 mr-3 text-${action.color}-600`} />
            {action.label}
          </TouchButton>
        );
      })}
    </div>
  );
};

/**
 * Mobile Loading Screen
 */
const MobileLoadingScreen = () => (
  <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
    <div className="text-center">
      <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
      <p className="text-lg text-gray-600">Loading machine data...</p>
    </div>
  </div>
);

/**
 * Floating Notification
 */
const FloatingNotification = ({ message, type, onClose }) => {
  const variants = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white',
    info: 'bg-blue-600 text-white'
  };

  return (
    <div className={`fixed top-20 left-4 right-4 p-4 rounded-lg shadow-lg z-50 ${variants[type]} transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{message}</span>
        <button onClick={onClose} className="ml-4 text-white opacity-75 hover:opacity-100">
          ×
        </button>
      </div>
    </div>
  );
};