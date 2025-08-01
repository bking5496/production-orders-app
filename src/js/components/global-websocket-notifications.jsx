import React, { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { useNotifications, useWebSocketEvent } from '../core/websocket-hooks.js';

export default function GlobalWebSocketNotifications() {
    const [toasts, setToasts] = useState([]);
    const { notifications } = useNotifications();

    // Auto-remove toasts after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setToasts(prev => prev.slice(0, -1));
        }, 5000);

        return () => clearTimeout(timer);
    }, [toasts.length]);

    // Listen for various WebSocket events and show notifications
    useWebSocketEvent('user_joined', (data) => {
        addToast(`${data.data.username} joined the system`, 'info');
    }, []);

    useWebSocketEvent('user_left', (data) => {
        addToast(`${data.data.username} left the system`, 'info');
    }, []);

    useWebSocketEvent('system_alert', (data) => {
        addToast(data.data.message, 'error');
    }, []);

    useWebSocketEvent('system_maintenance', (data) => {
        addToast(`System maintenance: ${data.data.message}`, 'warning');
    }, []);

    const addToast = (message, type = 'info') => {
        const toast = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date()
        };
        setToasts(prev => [toast, ...prev.slice(0, 4)]); // Keep max 5 toasts
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getToastStyles = (type) => {
        switch (type) {
            case 'success': return 'bg-green-50 border-green-200 text-green-800';
            case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            case 'error': return 'bg-red-50 border-red-200 text-red-800';
            default: return 'bg-blue-50 border-blue-200 text-blue-800';
        }
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`flex items-center gap-3 p-4 border rounded-lg shadow-lg max-w-sm animate-slide-in ${getToastStyles(toast.type)}`}
                >
                    {getIcon(toast.type)}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {toast.message}
                        </p>
                        <p className="text-xs opacity-75 mt-1">
                            {toast.timestamp.toLocaleTimeString()}
                        </p>
                    </div>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}

// Compact WebSocket activity indicator for headers
export function WebSocketActivity() {
    const [activity, setActivity] = useState([]);
    const [showActivity, setShowActivity] = useState(false);

    // Listen for any WebSocket message to show activity
    useWebSocketEvent('order_update', () => addActivity('Order updated'), []);
    useWebSocketEvent('machine_update', () => addActivity('Machine updated'), []);
    useWebSocketEvent('user_activity', (data) => addActivity(`${data.data.action}`), []);

    const addActivity = (message) => {
        const item = {
            id: Date.now(),
            message,
            timestamp: new Date()
        };
        setActivity(prev => [item, ...prev.slice(0, 9)]); // Keep last 10
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            setActivity(prev => prev.filter(a => a.id !== item.id));
        }, 10000);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowActivity(!showActivity)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs transition-colors ${
                    activity.length > 0 
                        ? 'bg-green-100 text-green-700 animate-pulse' 
                        : 'bg-gray-100 text-gray-500'
                }`}
                title="WebSocket Activity"
            >
                <div className={`w-2 h-2 rounded-full ${
                    activity.length > 0 ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                {activity.length > 0 && (
                    <span className="font-medium">{activity.length}</span>
                )}
            </button>

            {showActivity && activity.length > 0 && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b border-gray-100">
                        <h4 className="font-medium text-gray-900">Recent Activity</h4>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {activity.map((item) => (
                            <div key={item.id} className="p-3 border-b border-gray-50 last:border-0">
                                <p className="text-sm text-gray-700">{item.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {item.timestamp.toLocaleTimeString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}