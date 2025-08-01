// js/components/realtime-notifications.jsx - Real-time Notification System
// Handles WebSocket-based notifications and real-time updates

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './layout-components.jsx';

// Toast notification component
const Toast = ({ notification, onClose }) => {
  const { type, title, message, timestamp } = notification;
  
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'order_started':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'order_completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'order_stopped':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'order_resumed':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'machine_status_changed':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'order_started':
        return 'activity';
      case 'order_completed':
        return 'check';
      case 'order_stopped':
        return 'x';
      case 'order_resumed':
        return 'activity';
      case 'machine_status_changed':
        return 'settings';
      default:
        return 'info';
    }
  };

  return (
    <div className={`mb-3 p-4 rounded-lg border-l-4 shadow-md transition-all duration-300 ${getToastStyles()}`}>
      <div className="flex items-start">
        <Icon icon={getIcon()} size={20} className="mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-sm mt-1 text-gray-600">{message}</p>
          <p className="text-xs mt-2 text-gray-500">
            {new Date(timestamp).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <Icon icon="x" size={16} />
        </button>
      </div>
    </div>
  );
};

// Main notification container
const RealtimeNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const handlersRef = useRef({});

  useEffect(() => {
    if (!window.WebSocketService) {
      console.warn('WebSocket service not available');
      return;
    }

    // Connection status handlers
    const handleConnected = () => {
      setIsConnected(true);
      // Subscribe to relevant channels once
      window.WebSocketService.subscribe(['orders', 'machines', 'notifications']);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    // Real-time event handlers
    const handleOrderUpdate = (data) => {
      const { type, data: orderData, timestamp } = data;
      
      let title, message;
      
      switch (type) {
        case 'order_started':
          title = 'Production Started';
          message = `Order ${orderData.order.order_number} started on ${orderData.order.machine_name} by ${orderData.operator}`;
          break;
        case 'order_stopped':
          title = 'Production Stopped';
          message = `Order ${orderData.order.order_number} stopped - ${orderData.reason}`;
          break;
        case 'order_resumed':
          title = 'Production Resumed';
          message = `Order ${orderData.order.order_number} resumed by ${orderData.resumed_by}`;
          break;
        case 'order_completed':
          title = 'Order Completed';
          message = `Order ${orderData.order.order_number} completed (${orderData.efficiency.toFixed(1)}% efficiency)`;
          break;
        default:
          title = 'Order Update';
          message = `Order ${orderData.order?.order_number || 'Unknown'} has been updated`;
      }

      addNotification({
        id: `${type}_${Date.now()}`,
        type,
        title,
        message,
        timestamp,
        data: orderData
      });
    };

    const handleMachineUpdate = (data) => {
      const { type, data: machineData, timestamp } = data;
      
      if (type === 'machine_status_changed') {
        addNotification({
          id: `machine_${machineData.machine_id}_${Date.now()}`,
          type,
          title: 'Machine Status Changed',
          message: `Machine status updated to ${machineData.status}`,
          timestamp,
          data: machineData
        });
      }
    };

    const handleNotification = (data) => {
      const { data: notificationData, timestamp } = data;
      
      addNotification({
        id: `notification_${Date.now()}`,
        type: 'notification',
        title: notificationData.title || 'System Notification',
        message: notificationData.message || 'You have a new notification',
        timestamp,
        data: notificationData
      });
    };

    // Store handler references to ensure proper cleanup
    handlersRef.current = {
      handleConnected,
      handleDisconnected,
      handleOrderUpdate,
      handleMachineUpdate,
      handleNotification
    };

    // Register event listeners
    window.WebSocketService.on('connected', handleConnected);
    window.WebSocketService.on('authenticated', handleConnected);
    window.WebSocketService.on('disconnected', handleDisconnected);
    window.WebSocketService.on('order_update', handleOrderUpdate);
    window.WebSocketService.on('machine_update', handleMachineUpdate);
    window.WebSocketService.on('notification', handleNotification);

    // Check initial connection status
    const status = window.WebSocketService.getStatus();
    if (status.isConnected) {
      handleConnected();
    }

    return () => {
      // Clean up event listeners using stored references
      const handlers = handlersRef.current;
      window.WebSocketService.off('connected', handlers.handleConnected);
      window.WebSocketService.off('authenticated', handlers.handleConnected);
      window.WebSocketService.off('disconnected', handlers.handleDisconnected);
      window.WebSocketService.off('order_update', handlers.handleOrderUpdate);
      window.WebSocketService.off('machine_update', handlers.handleMachineUpdate);
      window.WebSocketService.off('notification', handlers.handleNotification);
    };
  }, []);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 most recent
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Live Updates</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`}></div>
          <button
            onClick={clearAllNotifications}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
        </div>
      </div>
      
      <div className="space-y-3 max-h-screen overflow-y-auto">
        {notifications.map((notification) => (
          <Toast
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </div>
  );
};

// Activity Feed Component for Dashboard
export const ActivityFeed = ({ maxItems = 10 }) => {
  const [activities, setActivities] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const handlersRef = useRef({});

  useEffect(() => {
    if (!window.WebSocketService) {
      return;
    }

    const handleConnected = () => {
      setIsConnected(true);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleActivity = (data) => {
      const { type, data: eventData, timestamp } = data;
      
      let activity = {
        id: `${type}_${Date.now()}`,
        type,
        timestamp,
        icon: 'activity',
        color: 'text-blue-600',
        data: eventData
      };

      switch (type) {
        case 'order_started':
          activity.message = `${eventData.operator} started production of ${eventData.order.order_number}`;
          activity.icon = 'activity';
          activity.color = 'text-blue-600';
          break;
        case 'order_completed':
          activity.message = `${eventData.completed_by} completed ${eventData.order.order_number} (${eventData.efficiency.toFixed(1)}% efficiency)`;
          activity.icon = 'check';
          activity.color = 'text-green-600';
          break;
        case 'order_stopped':
          activity.message = `${eventData.stopped_by} stopped ${eventData.order.order_number} - ${eventData.reason}`;
          activity.icon = 'x';
          activity.color = 'text-red-600';
          break;
        case 'order_resumed':
          activity.message = `${eventData.resumed_by} resumed ${eventData.order.order_number}`;
          activity.icon = 'activity';
          activity.color = 'text-yellow-600';
          break;
        case 'machine_status_changed':
          activity.message = `Machine status changed to ${eventData.status}`;
          activity.icon = 'settings';
          activity.color = 'text-purple-600';
          break;
        default:
          activity.message = 'Unknown activity';
      }

      setActivities(prev => [activity, ...prev.slice(0, maxItems - 1)]);
    };

    // Store handler references for proper cleanup
    handlersRef.current = {
      handleConnected,
      handleDisconnected,
      handleActivity
    };

    // Register listeners
    window.WebSocketService.on('connected', handleConnected);
    window.WebSocketService.on('authenticated', handleConnected);
    window.WebSocketService.on('disconnected', handleDisconnected);
    window.WebSocketService.on('order_update', handleActivity);
    window.WebSocketService.on('machine_update', handleActivity);

    // Check initial status
    const status = window.WebSocketService.getStatus();
    if (status.isConnected) {
      handleConnected();
    }

    return () => {
      const handlers = handlersRef.current;
      window.WebSocketService.off('connected', handlers.handleConnected);
      window.WebSocketService.off('authenticated', handlers.handleConnected);
      window.WebSocketService.off('disconnected', handlers.handleDisconnected);
      window.WebSocketService.off('order_update', handlers.handleActivity);
      window.WebSocketService.off('machine_update', handlers.handleActivity);
    };
  }, [maxItems]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`} title={isConnected ? 'Live updates active' : 'No live connection'}></div>
      </div>
      
      {activities.length === 0 ? (
        <p className="text-gray-500 text-sm">No recent activity</p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <Icon icon={activity.icon} size={16} className={`mt-0.5 ${activity.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RealtimeNotifications;