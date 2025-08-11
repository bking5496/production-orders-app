// React hooks for WebSocket integration
import { useState, useEffect, useCallback, useRef } from 'react';
import enhancedWebSocketService from './websocket-enhanced.js';

// Main WebSocket hook
export function useWebSocket() {
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [metrics, setMetrics] = useState({});
    
    useEffect(() => {
        const updateStatus = () => {
            const status = enhancedWebSocketService.getConnectionStatus();
            setConnectionStatus(status.state);
            setIsConnected(status.isConnected);
            setIsAuthenticated(status.isAuthenticated);
            setMetrics(enhancedWebSocketService.getMetrics());
        };

        // Update initial status
        updateStatus();

        // Update metrics periodically (less frequent to prevent refresh loops)
        const metricsInterval = setInterval(() => {
            setMetrics(enhancedWebSocketService.getMetrics());
        }, 30000);

        // Listen for connection state changes
        const handleStateChange = (data) => {
            setConnectionStatus(data.state);
        };

        const handleConnected = () => {
            setIsConnected(true);
            setConnectionStatus('connected');
        };

        const handleDisconnected = () => {
            setIsConnected(false);
            setIsAuthenticated(false);
            setConnectionStatus('disconnected');
        };

        const handleAuthenticated = () => {
            setIsAuthenticated(true);
        };

        // Register event listeners
        enhancedWebSocketService.on('connectionStateChanged', handleStateChange);
        enhancedWebSocketService.on('connected', handleConnected);
        enhancedWebSocketService.on('disconnected', handleDisconnected);
        enhancedWebSocketService.on('authenticated', handleAuthenticated);

        // Cleanup on unmount
        return () => {
            clearInterval(metricsInterval);
            enhancedWebSocketService.off('connectionStateChanged', handleStateChange);
            enhancedWebSocketService.off('connected', handleConnected);
            enhancedWebSocketService.off('disconnected', handleDisconnected);
            enhancedWebSocketService.off('authenticated', handleAuthenticated);
        };
    }, []);

    const connect = useCallback(async (token = null) => {
        try {
            await enhancedWebSocketService.connect(token);
        } catch (error) {
            console.error('Connection failed:', error);
        }
    }, []);

    const disconnect = useCallback(() => {
        enhancedWebSocketService.disconnect();
    }, []);

    const send = useCallback((type, data, priority = 'normal') => {
        return enhancedWebSocketService.send(type, data, priority);
    }, []);

    const subscribe = useCallback((channels, room = null) => {
        enhancedWebSocketService.subscribe(channels, room);
    }, []);

    const joinRoom = useCallback((room) => {
        enhancedWebSocketService.joinRoom(room);
    }, []);

    const leaveRoom = useCallback((room) => {
        enhancedWebSocketService.leaveRoom(room);
    }, []);

    return {
        connectionStatus,
        isConnected,
        isAuthenticated,
        metrics,
        connect,
        disconnect,
        send,
        subscribe,
        joinRoom,
        leaveRoom
    };
}

// Hook for listening to specific WebSocket events
export function useWebSocketEvent(eventType, handler, dependencies = []) {
    const handlerRef = useRef(handler);
    
    // Update handler reference when dependencies change
    useEffect(() => {
        handlerRef.current = handler;
    }, dependencies);

    useEffect(() => {
        const eventHandler = (data) => {
            handlerRef.current(data);
        };

        enhancedWebSocketService.on(eventType, eventHandler);

        return () => {
            enhancedWebSocketService.off(eventType, eventHandler);
        };
    }, [eventType]);
}

// Hook for production order updates
export function useOrderUpdates() {
    const [orders, setOrders] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(null);

    useWebSocketEvent('order_update', (data) => {
        setLastUpdate({
            type: data.type,
            order: data.data.order,
            timestamp: data.timestamp
        });

        // Update orders list based on the event type
        setOrders(prevOrders => {
            const orderId = data.data.order?.id;
            if (!orderId) return prevOrders;

            const updatedOrders = prevOrders.filter(order => order.id !== orderId);
            
            // Add updated order if it's not completed/archived
            if (data.type !== 'order_completed' || !data.data.order.archived) {
                updatedOrders.push(data.data.order);
            }

            return updatedOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });
    }, []);

    return { orders, lastUpdate, setOrders };
}

// Hook for machine status updates
export function useMachineUpdates() {
    const [machines, setMachines] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(null);

    useWebSocketEvent('machine_update', (data) => {
        setLastUpdate({
            type: data.type,
            machine: data.data,
            timestamp: data.timestamp
        });

        setMachines(prevMachines => {
            const machineId = data.data.machine_id;
            if (!machineId) return prevMachines;

            return prevMachines.map(machine => 
                machine.id === machineId 
                    ? { ...machine, status: data.data.status, order_id: data.data.order_id }
                    : machine
            );
        });
    }, []);

    return { machines, lastUpdate, setMachines };
}

// Hook for real-time notifications
export function useNotifications() {
    const [notifications, setNotifications] = useState([]);

    useWebSocketEvent('notification', (data) => {
        const notification = {
            id: Date.now(),
            message: data.data.message || data.data,
            type: data.data.type || 'info',
            timestamp: data.timestamp,
            priority: data.priority || 'normal'
        };

        setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
    }, []);

    useWebSocketEvent('alert', (data) => {
        const alert = {
            id: Date.now(),
            message: data.data.message || data.data,
            type: 'alert',
            timestamp: data.timestamp,
            priority: data.priority || 'high'
        };

        setNotifications(prev => [alert, ...prev.slice(0, 49)]);
    }, []);

    const clearNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    return { 
        notifications, 
        clearNotification, 
        clearAllNotifications,
        hasUnread: notifications.some(n => !n.read)
    };
}

// Hook for connection status with visual indicators
export function useConnectionStatus() {
    const { connectionStatus, isConnected, isAuthenticated, metrics } = useWebSocket();
    const [showReconnecting, setShowReconnecting] = useState(false);

    useWebSocketEvent('connectionStateChanged', (data) => {
        setShowReconnecting(data.state === 'reconnecting');
    }, []);

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected': return isAuthenticated ? 'green' : 'yellow';
            case 'connecting': return 'blue';
            case 'reconnecting': return 'orange';
            case 'error': return 'red';
            default: return 'gray';
        }
    };

    const getStatusText = () => {
        switch (connectionStatus) {
            case 'connected': return isAuthenticated ? 'Connected' : 'Authenticating';
            case 'connecting': return 'Connecting...';
            case 'reconnecting': return 'Reconnecting...';
            case 'error': return 'Connection Error';
            default: return 'Disconnected';
        }
    };

    const getStatusIcon = () => {
        switch (connectionStatus) {
            case 'connected': return isAuthenticated ? '🟢' : '🟡';
            case 'connecting': return '🔵';
            case 'reconnecting': return '🟠';
            case 'error': return '🔴';
            default: return '⚫';
        }
    };

    return {
        status: connectionStatus,
        isConnected,
        isAuthenticated,
        showReconnecting,
        color: getStatusColor(),
        text: getStatusText(),
        icon: getStatusIcon(),
        metrics
    };
}

// Auto-connection hook - connects WebSocket when user is authenticated
export function useAutoConnect() {
    const { connect, isConnected, isAuthenticated, subscribe } = useWebSocket();

    useEffect(() => {
        const checkAuthAndConnect = async () => {
            try {
                // Only check auth if there's a token in localStorage
                const token = localStorage.getItem('token');
                if (!token) {
                    console.log('ℹ️ No token found, skipping WebSocket connection');
                    return;
                }

                // Verify the token is still valid
                const response = await fetch('/api/auth/verify-session', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });

                if (response.ok && !isConnected) {
                    console.log('🔐 User authenticated, connecting WebSocket...');
                    await connect();
                } else if (response.status === 401) {
                    console.log('🚫 Token expired or invalid, removing from localStorage');
                    localStorage.removeItem('token');
                }
            } catch (error) {
                console.log('ℹ️ Not authenticated, skipping WebSocket connection');
                // If there's an error and we have a token, it might be invalid
                const token = localStorage.getItem('token');
                if (token) {
                    console.log('🧹 Removing potentially invalid token');
                    localStorage.removeItem('token');
                }
            }
        };

        // Only run if there's a token
        const token = localStorage.getItem('token');
        if (token) {
            checkAuthAndConnect();
        }
    }, [connect, isConnected]);

    // Auto-subscribe to channels after authentication
    useEffect(() => {
        if (isConnected && isAuthenticated) {
            const subscribeToChannels = async () => {
                try {
                    // Get user role to determine appropriate channels
                    const token = localStorage.getItem('token');
                    if (!token) return;

                    // Decode JWT to get user role (simple decode, not verification)
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    const userData = JSON.parse(jsonPayload);

                    // Subscribe to channels based on role
                    const baseChannels = ['general', 'notifications'];
                    let channels = [...baseChannels];

                    switch (userData.role) {
                        case 'admin':
                            channels.push('admin', 'production', 'machines', 'alerts', 'analytics');
                            break;
                        case 'supervisor':
                            channels.push('production', 'machines', 'alerts', 'analytics');
                            break;
                        case 'operator':
                            channels.push('production', 'machines');
                            break;
                        default:
                            // Keep only base channels for other roles
                            break;
                    }

                    console.log(`📺 Auto-subscribing to channels for ${userData.role}:`, channels);
                    subscribe(channels);
                    
                    // Join production room for production-related updates
                    if (['admin', 'supervisor', 'operator'].includes(userData.role)) {
                        enhancedWebSocketService.joinRoom('production');
                    }

                } catch (error) {
                    console.error('Failed to auto-subscribe to channels:', error);
                }
            };

            // Small delay to ensure WebSocket is fully connected
            const timer = setTimeout(subscribeToChannels, 100);
            return () => clearTimeout(timer);
        }
    }, [isConnected, isAuthenticated, subscribe]);
}