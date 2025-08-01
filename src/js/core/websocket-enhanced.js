// Enhanced WebSocket Service for Production Management System
// Provides advanced real-time communication with improved reliability

class EnhancedWebSocketService {
    constructor() {
        this.ws = null;
        this.connectionId = null;
        this.connectionState = 'disconnected';
        this.isAuthenticated = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = 30000;
        
        // Enhanced features
        this.messageQueue = [];
        this.subscriptions = new Set();
        this.rooms = new Set();
        this.eventHandlers = new Map();
        this.metrics = {
            messagesReceived: 0,
            messagesSent: 0,
            reconnections: 0,
            lastPing: null,
            connectionTime: null
        };
        
        // Timers
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
        this.connectionTimeoutTimer = null;
        
        console.log('🚀 Enhanced WebSocket Service initialized');
    }

    // Enhanced connection with improved error handling
    async connect(token = null) {
        if (this.connectionState === 'connecting' || this.isConnected()) {
            console.log('⚠️ WebSocket already connecting or connected');
            return Promise.resolve();
        }

        return new Promise(async (resolve, reject) => {
            try {
                this.connectionState = 'connecting';
                this.emit('connectionStateChanged', { state: 'connecting' });
                
                // Get authentication token
                const authToken = token || await this.getWebSocketToken();
                if (!authToken) {
                    throw new Error('No authentication token available');
                }

                // Build WebSocket URL with enhanced parameters
                const wsUrl = this.buildWebSocketUrl(authToken);
                console.log('🔗 Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));

                // Create WebSocket connection
                this.ws = new WebSocket(wsUrl);
                
                // Set connection timeout
                this.connectionTimeoutTimer = setTimeout(() => {
                    if (this.connectionState === 'connecting') {
                        this.ws.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);

                this.setupEnhancedEventHandlers(resolve, reject);
                
            } catch (error) {
                this.handleConnectionError(error);
                reject(error);
            }
        });
    }

    // Build WebSocket URL with environment detection
    buildWebSocketUrl(token) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // Development vs Production URL handling
        if (window.location.hostname === 'localhost') {
            return `ws://localhost:3000?token=${encodeURIComponent(token)}`;
        }
        
        // Production - try multiple connection options
        const urls = [
            `${protocol}//oracles.africa:3000?token=${encodeURIComponent(token)}`, // Direct port 3000
            `${protocol}//oracles.africa/ws?token=${encodeURIComponent(token)}`,   // Reverse proxy /ws
            `${protocol}//oracles.africa?token=${encodeURIComponent(token)}`       // Same origin
        ];
        
        // Return first URL for now, will try others in attemptConnection if needed
        return urls[0];
    }

    // Enhanced event handlers with better error recovery
    setupEnhancedEventHandlers(resolve, reject) {
        const connectionResolved = { value: false };

        this.ws.onopen = (event) => {
            if (this.connectionTimeoutTimer) {
                clearTimeout(this.connectionTimeoutTimer);
                this.connectionTimeoutTimer = null;
            }

            console.log('✅ Enhanced WebSocket connected');
            this.connectionState = 'connected';
            this.metrics.connectionTime = new Date();
            this.reconnectAttempts = 0;
            this.connectionId = `enh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            this.startHeartbeat();
            this.processMessageQueue();
            this.resubscribeToChannels();
            
            this.emit('connected', { 
                connectionId: this.connectionId,
                serverTime: new Date().toISOString(),
                enhanced: true
            });
            
            if (!connectionResolved.value) {
                connectionResolved.value = true;
                resolve();
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.metrics.messagesReceived++;
                this.handleEnhancedMessage(message);
            } catch (error) {
                console.error('💥 Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onclose = (event) => {
            if (this.connectionTimeoutTimer) {
                clearTimeout(this.connectionTimeoutTimer);
                this.connectionTimeoutTimer = null;
            }

            console.log(`🔌 Enhanced WebSocket disconnected - Code: ${event.code}, Reason: ${event.reason}`);
            this.handleDisconnection(event);
            
            if (!connectionResolved.value) {
                connectionResolved.value = true;
                reject(new Error(`Connection failed: ${event.code} ${event.reason}`));
            }
        };

        this.ws.onerror = (error) => {
            console.error('💥 Enhanced WebSocket error:', error);
            
            if (!connectionResolved.value) {
                connectionResolved.value = true;
                reject(error);
            }
        };
    }

    // Enhanced message handling with advanced routing
    handleEnhancedMessage(message) {
        const { type, data, room, channel, priority = 'normal', timestamp } = message;
        
        console.log(`📨 Enhanced message received: ${type}`, { room, channel, priority });

        // Handle system messages
        switch (type) {
            case 'welcome':
                this.isAuthenticated = true;
                this.emit('authenticated', data);
                console.log('🎉 Enhanced WebSocket authenticated:', data.user);
                break;

            case 'auth_error':
                console.error('🚫 Authentication failed:', data.error);
                this.disconnect();
                this.emit('auth_error', data);
                break;

            case 'pong':
                this.metrics.lastPing = new Date();
                break;

            case 'room_joined':
                this.rooms.add(data.room);
                console.log('🏠 Joined room:', data.room);
                this.emit('room_joined', data);
                break;

            case 'room_left':
                this.rooms.delete(data.room);
                console.log('🚪 Left room:', data.room);
                this.emit('room_left', data);
                break;

            case 'subscription_confirmed':
                data.channels?.forEach(ch => this.subscriptions.add(ch));
                this.emit('subscribed', data);
                break;

            case 'error':
                console.error('⚠️ Server error:', data.error);
                this.emit('server_error', data);
                break;

            // Production system events
            case 'order_started':
            case 'order_stopped':
            case 'order_resumed':
            case 'order_completed':
                this.emit('order_update', { type, data, timestamp, room, channel });
                this.emit(type, { data, timestamp, room, channel });
                break;

            case 'machine_status_changed':
                this.emit('machine_update', { type, data, timestamp, room, channel });
                this.emit(type, { data, timestamp, room, channel });
                break;

            case 'production_alert':
                this.emit('alert', { data, timestamp, priority, room, channel });
                break;

            case 'user_notification':
                this.emit('notification', { data, timestamp, priority });
                break;

            default:
                // Generic event emission for custom message types
                this.emit(type, { data, timestamp, room, channel, priority });
                break;
        }
    }

    // Enhanced subscription system with room support
    subscribe(channels, room = null) {
        if (typeof channels === 'string') channels = [channels];
        if (!Array.isArray(channels)) return;

        channels.forEach(ch => this.subscriptions.add(ch));

        const subscribeData = { channels };
        if (room) {
            subscribeData.room = room;
            this.rooms.add(room);
        }

        if (this.isConnected() && this.isAuthenticated) {
            this.send('subscribe', subscribeData);
            console.log('📺 Subscribing to channels:', channels, room ? `in room: ${room}` : '');
        } else {
            console.log('📺 Queued subscription (will subscribe when connected):', channels);
        }
    }

    // Join a room for targeted messaging
    joinRoom(room) {
        if (this.isConnected() && this.isAuthenticated) {
            this.send('join_room', { room });
            console.log('🏠 Joining room:', room);
        } else {
            console.log('🏠 Queued room join:', room);
        }
    }

    // Leave a room
    leaveRoom(room) {
        if (this.isConnected() && this.isAuthenticated) {
            this.send('leave_room', { room });
            this.rooms.delete(room);
            console.log('🚪 Leaving room:', room);
        }
    }

    // Enhanced send with message queuing
    send(type, data = {}, priority = 'normal') {
        const message = {
            type,
            data,
            priority,
            timestamp: new Date().toISOString(),
            clientId: this.connectionId
        };

        if (!this.isConnected()) {
            // Queue message for later sending
            this.messageQueue.push(message);
            console.log('📬 Message queued:', type);
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            this.metrics.messagesSent++;
            console.log(`📤 Enhanced message sent: ${type}`);
            return true;
        } catch (error) {
            console.error('💥 Failed to send message:', error);
            this.messageQueue.push(message); // Queue failed message
            return false;
        }
    }

    // Process queued messages after reconnection
    processMessageQueue() {
        if (this.messageQueue.length === 0) return;
        
        console.log(`📬 Processing ${this.messageQueue.length} queued messages`);
        const messages = [...this.messageQueue];
        this.messageQueue = [];
        
        messages.forEach(message => {
            this.send(message.type, message.data, message.priority);
        });
    }

    // Resubscribe to channels after reconnection
    resubscribeToChannels() {
        if (this.subscriptions.size > 0) {
            const channels = Array.from(this.subscriptions);
            this.send('subscribe', { channels });
            console.log('🔄 Resubscribed to channels:', channels);
        }

        if (this.rooms.size > 0) {
            this.rooms.forEach(room => {
                this.send('join_room', { room });
            });
            console.log('🔄 Rejoined rooms:', Array.from(this.rooms));
        }
    }

    // Enhanced heartbeat with latency tracking
    startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected()) {
                const pingTime = Date.now();
                this.send('ping', { clientTime: pingTime });
            }
        }, this.heartbeatInterval);
        
        console.log(`💓 Enhanced heartbeat started (${this.heartbeatInterval}ms)`);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // Enhanced reconnection with exponential backoff
    handleDisconnection(event) {
        this.connectionState = 'disconnected';
        this.isAuthenticated = false;
        this.stopHeartbeat();
        
        this.emit('disconnected', { 
            code: event.code, 
            reason: event.reason,
            connectionTime: this.metrics.connectionTime,
            reconnectAttempts: this.reconnectAttempts
        });

        // Don't reconnect if it was a deliberate close
        if (event.code !== 1000 && event.code !== 1001) {
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.emit('max_reconnect_attempts');
            return;
        }

        // Exponential backoff with jitter
        const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        this.reconnectAttempts++;
        this.metrics.reconnections++;
        
        console.log(`🔄 Scheduling reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms`);
        
        this.connectionState = 'reconnecting';
        this.emit('connectionStateChanged', { 
            state: 'reconnecting', 
            attempt: this.reconnectAttempts,
            delay: Math.round(delay)
        });
        
        this.reconnectTimer = setTimeout(() => {
            this.connect().catch(error => {
                console.warn('🔄 Reconnection failed:', error.message);
            });
        }, delay);
    }

    // Connection utilities
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    getConnectionStatus() {
        return {
            state: this.connectionState,
            isConnected: this.isConnected(),
            isAuthenticated: this.isAuthenticated,
            connectionId: this.connectionId,
            subscriptions: Array.from(this.subscriptions),
            rooms: Array.from(this.rooms),
            queuedMessages: this.messageQueue.length,
            metrics: { ...this.metrics },
            reconnectAttempts: this.reconnectAttempts
        };
    }

    // Enhanced disconnect with cleanup
    disconnect() {
        console.log('🔌 Disconnecting Enhanced WebSocket');
        
        this.stopHeartbeat();
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.connectionTimeoutTimer) {
            clearTimeout(this.connectionTimeoutTimer);
            this.connectionTimeoutTimer = null;
        }
        
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        
        this.connectionState = 'disconnected';
        this.isAuthenticated = false;
        this.reconnectAttempts = 0;
        this.connectionId = null;
        
        // Clear but don't lose subscriptions for next connection
        this.messageQueue = [];
        
        this.emit('disconnected', { deliberate: true });
    }

    // Event system
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        
        this.eventHandlers.get(event).add(handler);
        console.log(`👂 Handler registered for: ${event}`);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).delete(handler);
        }
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`💥 Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    // Get WebSocket token with enhanced error handling
    async getWebSocketToken() {
        try {
            const response = await fetch('/api/auth/websocket-token', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.status === 401) {
                console.warn('🚫 Not authenticated for WebSocket');
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.token;
        } catch (error) {
            console.error('Failed to get WebSocket token:', error);
            return null;
        }
    }

    // Debug utilities
    getMetrics() {
        return {
            ...this.metrics,
            uptime: this.metrics.connectionTime ? Date.now() - this.metrics.connectionTime.getTime() : 0,
            subscriptionCount: this.subscriptions.size,
            roomCount: this.rooms.size,
            handlerCount: Array.from(this.eventHandlers.values()).reduce((sum, handlers) => sum + handlers.size, 0)
        };
    }

    resetMetrics() {
        this.metrics = {
            messagesReceived: 0,
            messagesSent: 0,
            reconnections: 0,
            lastPing: null,
            connectionTime: this.metrics.connectionTime
        };
    }
}

// Create enhanced singleton
const enhancedWebSocketService = new EnhancedWebSocketService();

// Export both the class and instance
export { EnhancedWebSocketService };
export default enhancedWebSocketService;

// Global access
window.EnhancedWebSocketService = enhancedWebSocketService;