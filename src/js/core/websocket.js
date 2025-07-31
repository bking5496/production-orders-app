// js/core/websocket.js - WebSocket Service for Real-time Updates
// Provides authenticated WebSocket connection with automatic reconnection

class WebSocketService {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = window.APP_CONFIG?.WS_RECONNECT_ATTEMPTS || 5;
        this.reconnectDelay = window.APP_CONFIG?.WS_RECONNECT_DELAY || 1000;
        this.pingInterval = window.APP_CONFIG?.WS_PING_INTERVAL || 30000;
        this.subscriptions = [];
        this.eventHandlers = new Map();
        this.isConnecting = false;
        this.isAuthenticated = false;
        this.pingTimer = null;
        this.reconnectTimer = null;
        
        // Connection state
        this.connectionState = 'disconnected'; // disconnected, connecting, connected, error
        this.lastConnectionAttempt = null;
        this.connectionId = null;
        
        console.log('🔌 WebSocket Service initialized');
    }

    // Connect to WebSocket server with JWT authentication
    async connect(token = null) {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            console.log('⚠️ WebSocket already connecting or connected');
            return;
        }

        try {
            this.isConnecting = true;
            this.connectionState = 'connecting';
            this.lastConnectionAttempt = new Date();
            
            // Get token from parameter or fetch from API
            let authToken = token;
            if (!authToken) {
                authToken = await this.getWebSocketToken();
            }
            
            if (!authToken) {
                throw new Error('No authentication token available');
            }

            // Build WebSocket URL with token
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}?token=${encodeURIComponent(authToken)}`;
            
            console.log('🔗 Connecting to WebSocket:', wsUrl.replace(/token=[^&]+/, 'token=***'));
            
            this.ws = new WebSocket(wsUrl);
            this.setupEventHandlers();
            
        } catch (error) {
            console.error('💥 WebSocket connection error:', error);
            this.handleConnectionError(error);
        }
    }

    // Set up WebSocket event handlers
    setupEventHandlers() {
        if (!this.ws) return;

        this.ws.onopen = (event) => {
            console.log('✅ WebSocket connected successfully');
            this.isConnecting = false;
            this.isAuthenticated = false; // Will be set to true on welcome message
            this.connectionState = 'connected';
            this.reconnectAttempts = 0;
            
            // Generate connection ID for this session
            this.connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Notify listeners
            this.emit('connected', { connectionId: this.connectionId });
            
            // Start heartbeat
            this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('💥 Failed to parse WebSocket message:', error, event.data);
            }
        };

        this.ws.onclose = (event) => {
            console.log(`🔌 WebSocket disconnected - Code: ${event.code}, Reason: ${event.reason}`);
            this.handleDisconnection(event);
        };

        this.ws.onerror = (event) => {
            console.error('💥 WebSocket error:', event);
            this.handleConnectionError(new Error('WebSocket connection error'));
        };
    }

    // Handle incoming WebSocket messages
    handleMessage(message) {
        const { type, data, channel, timestamp } = message;
        
        console.log(`📨 WebSocket message received: ${type}`, data);

        switch (type) {
            case 'welcome':
                this.isAuthenticated = true;
                console.log('🎉 WebSocket authentication successful:', data.user);
                this.emit('authenticated', data);
                
                // Re-subscribe to channels after reconnection
                if (this.subscriptions.length > 0) {
                    this.subscribe(this.subscriptions);
                }
                break;

            case 'auth_error':
                console.error('🚫 WebSocket authentication failed:', data.error);
                this.connectionState = 'error';
                this.emit('auth_error', data);
                this.disconnect();
                break;

            case 'pong':
                // Heartbeat response - connection is alive
                break;

            case 'subscription_confirmed':
                console.log('📺 Subscription confirmed for channels:', data.channels);
                this.emit('subscribed', data);
                break;

            case 'unsubscription_confirmed':
                console.log('📺 Unsubscription confirmed for channels:', data.channels);
                this.emit('unsubscribed', data);
                break;

            case 'error':
                console.error('⚠️ WebSocket server error:', data.error);
                this.emit('error', data);
                break;

            // Production events
            case 'order_started':
            case 'order_stopped':
            case 'order_resumed':
            case 'order_completed':
                this.emit('order_update', { type, data, timestamp });
                this.emit(type, { data, timestamp });
                break;

            case 'machine_status_changed':
                this.emit('machine_update', { type, data, timestamp });
                this.emit(type, { data, timestamp });
                break;

            case 'notification':
                this.emit('notification', { data, timestamp });
                break;

            default:
                // Emit generic event for unknown message types
                this.emit(type, { data, timestamp });
                break;
        }
    }

    // Handle connection disconnection
    handleDisconnection(event) {
        this.isConnecting = false;
        this.isAuthenticated = false;
        this.connectionState = 'disconnected';
        this.stopHeartbeat();
        
        this.emit('disconnected', { 
            code: event.code, 
            reason: event.reason,
            wasAuthenticated: this.isAuthenticated
        });

        // Attempt to reconnect unless it was a deliberate close
        if (event.code !== 1000 && event.code !== 1001) {
            this.scheduleReconnect();
        }
    }

    // Handle connection errors
    handleConnectionError(error) {
        this.isConnecting = false;
        this.connectionState = 'error';
        this.stopHeartbeat();
        
        console.error('💥 WebSocket connection error:', error.message);
        this.emit('error', { error: error.message });
        
        this.scheduleReconnect();
    }

    // Schedule automatic reconnection
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.emit('max_reconnect_attempts');
            return;
        }

        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts); // Exponential backoff
        this.reconnectAttempts++;
        
        console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        this.reconnectTimer = setTimeout(() => {
            console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            this.connect();
        }, delay);
        
        this.emit('reconnecting', { 
            attempt: this.reconnectAttempts, 
            maxAttempts: this.maxReconnectAttempts, 
            delay 
        });
    }

    // Subscribe to specific channels
    subscribe(channels) {
        if (!Array.isArray(channels)) {
            channels = [channels];
        }

        // Add to local subscriptions
        this.subscriptions = [...new Set([...this.subscriptions, ...channels])];

        // Send subscription request if connected
        if (this.isConnected() && this.isAuthenticated) {
            this.send('subscribe', { channels });
            console.log('📺 Subscribing to channels:', channels);
        } else {
            console.log('📺 Queued subscription for channels (will subscribe when connected):', channels);
        }
    }

    // Unsubscribe from channels
    unsubscribe(channels) {
        if (!Array.isArray(channels)) {
            channels = [channels];
        }

        // Remove from local subscriptions
        this.subscriptions = this.subscriptions.filter(ch => !channels.includes(ch));

        // Send unsubscription request if connected
        if (this.isConnected() && this.isAuthenticated) {
            this.send('unsubscribe', { channels });
            console.log('📺 Unsubscribing from channels:', channels);
        }
    }

    // Send message to WebSocket server
    send(type, data = {}) {
        if (!this.isConnected()) {
            console.warn('⚠️ Cannot send message - WebSocket not connected');
            return false;
        }

        try {
            const message = JSON.stringify({ type, ...data });
            this.ws.send(message);
            console.log(`📤 Sent WebSocket message: ${type}`);
            return true;
        } catch (error) {
            console.error('💥 Failed to send WebSocket message:', error);
            return false;
        }
    }

    // Start heartbeat to keep connection alive
    startHeartbeat() {
        this.stopHeartbeat(); // Clear any existing timer
        
        this.pingTimer = setInterval(() => {
            if (this.isConnected()) {
                this.send('ping');
            }
        }, this.pingInterval);
        
        console.log(`💓 Started WebSocket heartbeat (${this.pingInterval}ms)`);
    }

    // Stop heartbeat
    stopHeartbeat() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
            console.log('💓 Stopped WebSocket heartbeat');
        }
    }

    // Disconnect WebSocket
    disconnect() {
        console.log('🔌 Disconnecting WebSocket');
        
        this.stopHeartbeat();
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        
        this.isConnecting = false;
        this.isAuthenticated = false;
        this.connectionState = 'disconnected';
        this.reconnectAttempts = 0;
        this.subscriptions = [];
    }

    // Check if WebSocket is connected
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    // Get connection status
    getStatus() {
        return {
            state: this.connectionState,
            isConnected: this.isConnected(),
            isAuthenticated: this.isAuthenticated,
            subscriptions: [...this.subscriptions],
            reconnectAttempts: this.reconnectAttempts,
            connectionId: this.connectionId,
            lastConnectionAttempt: this.lastConnectionAttempt
        };
    }

    // Event emitter functionality
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
        
        console.log(`👂 Registered handler for event: ${event}`);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
                console.log(`🚫 Removed handler for event: ${event}`);
            }
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

    // Get WebSocket token from API with retry logic for rate limiting
    async getWebSocketToken() {
        const maxRetries = 3;
        let attempt = 0;
        
        while (attempt < maxRetries) {
            try {
                const response = await fetch('/api/auth/websocket-token', {
                    method: 'GET',
                    credentials: 'include', // Include httpOnly cookies
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.status === 429) {
                    // Rate limited - wait before retry
                    const retryAfter = response.headers.get('Retry-After') || (Math.pow(2, attempt) * 1000);
                    const delay = parseInt(retryAfter) * 1000 || (Math.pow(2, attempt) * 1000);
                    console.warn(`⏳ Rate limited (429). Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
                    
                    if (attempt < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                        attempt++;
                        continue;
                    }
                }

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return data.token;
            } catch (error) {
                if (attempt === maxRetries - 1) {
                    console.error('Failed to get WebSocket token after all retries:', error);
                    return null;
                }
                
                // Exponential backoff for other errors
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`⚠️ Token fetch failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
            }
        }
        
        return null;
    }

    // Get JWT token from cookie (fallback method)
    getTokenFromCookie() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token') {
                return decodeURIComponent(value);
            }
        }
        return null;
    }

    // Manual reconnection
    reconnect() {
        console.log('🔄 Manual reconnection triggered');
        this.disconnect();
        setTimeout(() => this.connect(), 1000);
    }

    // Reset reconnection counter
    resetReconnectionAttempts() {
        this.reconnectAttempts = 0;
        console.log('🔄 Reset reconnection attempts counter');
    }
}

// Create singleton instance
const websocketService = new WebSocketService();

// Auto-connect when DOM is loaded (if authenticated)
document.addEventListener('DOMContentLoaded', async () => {
    // Small delay to ensure the page is fully loaded
    setTimeout(async () => {
        try {
            console.log('🚀 Auto-connecting WebSocket on page load');
            await websocketService.connect();
        } catch (error) {
            console.log('⚠️ Auto-connect failed - user may not be authenticated');
        }
    }, 1000);
});

// Handle page visibility changes to reconnect when page becomes visible
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && !websocketService.isConnected()) {
        try {
            console.log('🔄 Page visible - attempting to reconnect WebSocket');
            await websocketService.connect();
        } catch (error) {
            console.log('⚠️ Reconnect failed - user may not be authenticated');
        }
    }
});

// Export the service
window.WebSocketService = websocketService;

export default websocketService;