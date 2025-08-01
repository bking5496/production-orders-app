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

        // Listen for connection state changes
        const handleStateChange = (data) => {
            setConnectionStatus(data.state);
            updateStatus();
        };

        const handleConnected = () => {
            setIsConnected(true);
            setConnectionStatus('connected');
            updateStatus();
        };

        const handleDisconnected = () => {
            setIsConnected(false);
            setIsAuthenticated(false);
            setConnectionStatus('disconnected');
            updateStatus();
        };

        const handleAuthenticated = () => {
            setIsAuthenticated(true);
            updateStatus();
        };

        // Register event listeners
        enhancedWebSocketService.on('connectionStateChanged', handleStateChange);
        enhancedWebSocketService.on('connected', handleConnected);
        enhancedWebSocketService.on('disconnected', handleDisconnected);
        enhancedWebSocketService.on('authenticated', handleAuthenticated);

        // Cleanup on unmount
        return () => {
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
    const { connect, isConnected } = useWebSocket();

    useEffect(() => {
        const checkAuthAndConnect = async () => {
            try {
                const response = await fetch('/api/auth/verify-session', {
                    credentials: 'include'
                });

                if (response.ok && !isConnected) {
                    console.log('🔐 User authenticated, connecting WebSocket...');
                    await connect();
                }
            } catch (error) {
                console.log('ℹ️ Not authenticated, skipping WebSocket connection');
            }
        };

        checkAuthAndConnect();
    }, [connect, isConnected]);
}