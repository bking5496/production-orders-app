import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, Square, Plus, Clock, AlertTriangle, CheckCircle, 
  Wifi, WifiOff, User, RefreshCw, Target, Package
} from 'lucide-react';
import API from '../core/api';
import { useAuth } from '../core/auth';
import { useOrderUpdates, useAutoConnect, useNotifications } from '../core/websocket-hooks.js';

/**
 * Mobile-First Operator Dashboard
 * Optimized for tablet/mobile use on manufacturing floor
 * Features: Large touch targets, high contrast, single-task focus
 */
export default function MobileOperatorDashboard() {
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  const { user } = useAuth();
  useAutoConnect();
  const { lastUpdate: orderUpdate } = useOrderUpdates();
  const { notifications: wsNotifications } = useNotifications();

  // Load current operator's active order
  useEffect(() => {
    loadCurrentOrder();
    const interval = setInterval(loadCurrentOrder, 15000); // Frequent updates for mobile
    return () => clearInterval(interval);
  }, []);

  const loadCurrentOrder = async () => {
    try {
      const orders = await API.get('/orders?status=in_progress&operator=' + user?.id);
      setCurrentOrder(orders[0] || null);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load current order:', error);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  if (loading) {
    return <MobileLoadingScreen />;
  }

  return (
    <div className="mobile-operator-dashboard min-h-screen bg-gray-100">
      {/* Sticky Header - Navigation & Status */}
      <header className="sticky top-0 z-50 bg-gray-900 text-white shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold">Production Station</h1>
            <p className="text-sm text-gray-300">Operator: {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionIndicator status={connectionStatus} />
            <LastUpdateBadge time={lastUpdate} />
          </div>
        </div>
      </header>

      {/* Main Content - Single Column Layout */}
      <main className="p-4 space-y-6 pb-20">
        {/* Current Order Card */}
        {currentOrder ? (
          <ActiveOrderCard 
            order={currentOrder} 
            onUpdate={loadCurrentOrder}
            onNotify={showNotification}
          />
        ) : (
          <NoActiveOrderCard onRefresh={loadCurrentOrder} />
        )}

        {/* Quick Stats */}
        <QuickStatsGrid />

        {/* Secondary Actions */}
        <SecondaryActionsPanel />
      </main>

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
 * Active Order Card - Primary Production Interface
 * 44px+ touch targets, high contrast, single-task focus
 */
const ActiveOrderCard = ({ order, onUpdate, onNotify }) => {
  const [showActions, setShowActions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const progressPercentage = Math.round((order.actual_quantity / order.quantity) * 100);
  const isNearComplete = progressPercentage >= 90;
  
  const handlePrimaryAction = () => {
    if (order.status === 'in_progress') {
      setShowActions(true); // Show stop/pause options
    } else {
      handleStartProduction();
    }
  };

  const handleStartProduction = async () => {
    setIsUpdating(true);
    try {
      await API.post(`/orders/${order.id}/start`);
      onUpdate();
      onNotify('Production started', 'success');
    } catch (error) {
      onNotify('Failed to start production', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStopProduction = async (reason) => {
    setIsUpdating(true);
    try {
      await API.post(`/orders/${order.id}/stop`, { reason });
      onUpdate();
      onNotify('Production stopped', 'warning');
      setShowActions(false);
    } catch (error) {
      onNotify('Failed to stop production', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="active-order-card">
      {/* Order Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-600 text-white p-4">
          <h2 className="text-2xl font-bold">{order.order_number}</h2>
          <p className="text-blue-100">{order.product_name}</p>
        </div>

        {/* Progress Section - Large, Easy to Read */}
        <div className="p-6 bg-gradient-to-br from-blue-50 to-white">
          <div className="text-center mb-6">
            <div className="text-6xl font-mono font-bold text-gray-900 mb-2">
              {order.actual_quantity || 0}
            </div>
            <div className="text-2xl text-gray-600">
              of {order.quantity} units
            </div>
            <div className="text-lg font-semibold text-blue-600 mt-2">
              {progressPercentage}% Complete
            </div>
          </div>

          {/* Visual Progress Bar - Large and Clear */}
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ${
                  isNearComplete ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
            
            {/* Status Indicators */}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Started: {new Date(order.start_time).toLocaleTimeString()}</span>
              <span className={`font-semibold ${
                order.status === 'in_progress' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {order.status === 'in_progress' ? '● RUNNING' : '⏸ PAUSED'}
              </span>
            </div>
          </div>
        </div>

        {/* One-Tap Production Controls - Extra Large Touch Targets */}
        <div className="p-6 bg-gray-50 border-t space-y-4">
          {!showActions ? (
            <div className="grid grid-cols-1 gap-4">
              {/* Primary Action - Start/Stop */}
              <TouchButton
                onClick={handlePrimaryAction}
                disabled={isUpdating}
                variant={order.status === 'in_progress' ? 'danger' : 'success'}
                size="large"
                loading={isUpdating}
                className="h-16 text-xl font-bold"
              >
                {order.status === 'in_progress' ? (
                  <>
                    <Square className="w-8 h-8 mr-4" />
                    STOP PRODUCTION
                  </>
                ) : (
                  <>
                    <Play className="w-8 h-8 mr-4" />
                    START PRODUCTION
                  </>
                )}
              </TouchButton>
              
              {/* Quick Pause for Break */}
              {order.status === 'in_progress' && (
                <TouchButton
                  onClick={() => handleStopProduction('operator_break')}
                  disabled={isUpdating}
                  variant="warning"
                  size="medium"
                  className="h-14 text-lg"
                >
                  <Clock className="w-6 h-6 mr-3" />
                  Quick Break
                </TouchButton>
              )}
            </div>
          ) : (
            <StopReasonSelector 
              onSelect={handleStopProduction}
              onCancel={() => setShowActions(false)}
              loading={isUpdating}
            />
          )}
        </div>

        {/* Secondary Actions - Update Quantity */}
        <div className="p-4 bg-white border-t">
          <TouchButton
            onClick={() => {/* Open quantity updater */}}
            variant="outline"
            size="medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Update Quantity
          </TouchButton>
        </div>
      </div>
    </div>
  );
};

/**
 * Touch-Optimized Button Component
 * Minimum 44px height, high contrast, clear visual feedback
 */
const TouchButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false,
  loading = false,
  className = '',
  ...props 
}) => {
  const baseClasses = "w-full flex items-center justify-center font-semibold rounded-lg transition-all duration-200 active:scale-95 focus:outline-none focus:ring-4";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300 active:bg-blue-800",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-300 active:bg-green-800",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-300 active:bg-red-800",
    warning: "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-300 active:bg-yellow-800",
    outline: "bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300 active:bg-gray-100"
  };
  
  const sizes = {
    small: "h-11 px-4 text-sm", // 44px min
    medium: "h-12 px-6 text-base", // 48px
    large: "h-14 px-8 text-lg" // 56px for primary actions
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};

/**
 * Stop Reason Selector - Quick Single-Tap Options with Emergency Stop
 */
const StopReasonSelector = ({ onSelect, onCancel, loading }) => {
  const reasons = [
    { id: 'emergency_stop', label: '🚨 EMERGENCY STOP', icon: AlertTriangle, color: 'red', urgent: true },
    { id: 'material_shortage', label: 'Material Shortage', icon: Package, color: 'orange' },
    { id: 'operator_break', label: 'Break Time', icon: Clock, color: 'blue' },
    { id: 'machine_issue', label: 'Machine Issue', icon: AlertTriangle, color: 'red' },
    { id: 'quality_issue', label: 'Quality Problem', icon: AlertTriangle, color: 'red' },
    { id: 'shift_change', label: 'Shift Change', icon: User, color: 'green' }
  ];

  return (
    <div className="space-y-2">
      <p className="text-lg font-bold text-gray-800 mb-4 text-center">Stop Production</p>
      {reasons.map(reason => {
        const Icon = reason.icon;
        return (
          <TouchButton
            key={reason.id}
            onClick={() => onSelect(reason.id)}
            variant={reason.urgent ? "danger" : "outline"}
            size={reason.urgent ? "large" : "medium"}
            disabled={loading}
            className={`justify-start ${reason.urgent ? 'animate-pulse border-4 border-red-400' : ''}`}
          >
            <Icon className={`w-6 h-6 mr-4 ${reason.urgent ? 'text-white' : `text-${reason.color}-600`}`} />
            <span className={reason.urgent ? 'text-xl font-bold' : 'text-lg'}>{reason.label}</span>
          </TouchButton>
        );
      })}
      <div className="pt-4 border-t">
        <TouchButton
          onClick={onCancel}
          variant="outline"
          size="medium"
          className="text-gray-600"
        >
          ← Cancel
        </TouchButton>
      </div>
    </div>
  );
};

/**
 * Connection Status Indicator
 */
const ConnectionIndicator = ({ status }) => {
  const indicators = {
    connected: { icon: Wifi, color: 'text-green-400', label: 'Online' },
    connecting: { icon: RefreshCw, color: 'text-yellow-400 animate-spin', label: 'Connecting' },
    disconnected: { icon: WifiOff, color: 'text-red-400', label: 'Offline' },
    error: { icon: AlertTriangle, color: 'text-red-400', label: 'Error' }
  };
  
  const { icon: Icon, color, label } = indicators[status] || indicators.disconnected;
  
  return (
    <div className="flex items-center gap-1">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-xs">{label}</span>
    </div>
  );
};

/**
 * Last Update Badge
 */
const LastUpdateBadge = ({ time }) => (
  <div className="text-xs text-gray-300">
    Updated: {time.toLocaleTimeString()}
  </div>
);

/**
 * No Active Order State
 */
const NoActiveOrderCard = ({ onRefresh }) => (
  <div className="bg-white rounded-lg shadow-lg p-8 text-center">
    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Orders</h3>
    <p className="text-gray-500 mb-6">No production orders are currently assigned to your station.</p>
    <TouchButton onClick={onRefresh} variant="outline" size="medium">
      <RefreshCw className="w-5 h-5 mr-2" />
      Check for Orders
    </TouchButton>
  </div>
);

/**
 * Quick Stats Grid - At-a-Glance Information
 */
const QuickStatsGrid = () => (
  <div className="grid grid-cols-2 gap-4">
    <StatCard title="Today's Output" value="247" unit="units" color="blue" />
    <StatCard title="Efficiency" value="94%" color="green" />
    <StatCard title="Quality Rate" value="99.2%" color="green" />
    <StatCard title="Orders Complete" value="3" color="blue" />
  </div>
);

const StatCard = ({ title, value, unit = '', color }) => (
  <div className="bg-white rounded-lg shadow p-4 text-center">
    <div className={`text-2xl font-bold text-${color}-600 mb-1`}>
      {value}{unit}
    </div>
    <div className="text-sm text-gray-600">{title}</div>
  </div>
);

/**
 * Secondary Actions Panel
 */
const SecondaryActionsPanel = () => (
  <div className="bg-white rounded-lg shadow-lg p-4">
    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
    <div className="space-y-3">
      <TouchButton variant="outline" size="small" className="justify-start">
        <AlertTriangle className="w-4 h-4 mr-3 text-yellow-600" />
        Report Issue
      </TouchButton>
      <TouchButton variant="outline" size="small" className="justify-start">
        <Target className="w-4 h-4 mr-3 text-blue-600" />
        View Instructions
      </TouchButton>
      <TouchButton variant="outline" size="small" className="justify-start">
        <CheckCircle className="w-4 h-4 mr-3 text-green-600" />
        Quality Check
      </TouchButton>
    </div>
  </div>
);

/**
 * Mobile Loading Screen
 */
const MobileLoadingScreen = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="text-center">
      <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
      <p className="text-lg text-gray-600">Loading production data...</p>
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