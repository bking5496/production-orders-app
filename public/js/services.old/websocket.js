// js/services/websocket.js - WebSocket Service Module
// Handles real-time communication with the server

class WebSocketService {
  constructor() {
    this.ws = null;
    this.url = window.APP_CONFIG?.WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.messageQueue = [];
    this.isConnected = false;
    this.shouldReconnect = true;
    this.pingInterval = null;
    this.connectionPromise = null;
  }

  // Connect to WebSocket server
  async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to WebSocket:', this.url);
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.connectionPromise = null;
          
          // Send any queued messages
          this.processMessageQueue();
          
          // Start ping interval to keep connection alive
          this.startPingInterval();
          
          // Emit connected event
          this.emit('connected');
          window.dispatchEvent(new CustomEvent('ws:connected'));
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.emit('error', error);
          window.dispatchEvent(new CustomEvent('ws:error', { detail: error }));
        };
        
        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected', { code: event.code, reason: event.reason });
          this.isConnected = false;
          this.connectionPromise = null;
          this.stopPingInterval();
          
          // Emit disconnected event
          this.emit('disconnected', event);
          window.dispatchEvent(new CustomEvent('ws:disconnected', { detail: event }));
          
          // Attempt to reconnect if not a deliberate close
          if (this.shouldReconnect && event.code !== 1000) {
            this.reconnect();
          }
          
          reject(new Error('WebSocket connection closed'));
        };
        
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // Reconnect with exponential backoff
  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed');
      window.dispatchEvent(new CustomEvent('ws:reconnect_failed'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  // Disconnect from WebSocket
  disconnect() {
    this.shouldReconnect = false;
    this.stopPingInterval();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.messageQueue = [];
    this.listeners.clear();
  }

  // Send message to server
  send(type, data) {
    const message = {
      type,
      data,
      timestamp: new Date().toISOString(),
      id: this.generateMessageId()
    };

    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        if (window.APP_CONFIG?.DEBUG) {
          console.log('📤 WebSocket sent:', message);
        }
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.queueMessage(message);
      }
    } else {
      this.queueMessage(message);
    }
  }

  // Queue message for later sending
  queueMessage(message) {
    this.messageQueue.push(message);
    console.log('📦 Message queued for sending when connected');
  }

  // Process queued messages
  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      try {
        this.ws.send(JSON.stringify(message));
        console.log('📤 Queued message sent:', message);
      } catch (error) {
        console.error('Failed to send queued message:', error);
        // Put it back at the front of the queue
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  // Handle incoming messages
  handleMessage(message) {
    if (window.APP_CONFIG?.DEBUG) {
      console.log('📥 WebSocket received:', message);
    }

    const { type, data, timestamp } = message;
    
    // Emit to specific listeners
    this.emit(type, data, timestamp);
    
    // Emit generic message event
    this.emit('message', message);
    
    // Dispatch custom DOM event
    window.dispatchEvent(new CustomEvent(`ws:${type}`, { 
      detail: { data, timestamp } 
    }));

    // Handle specific message types
    switch (type) {
      case 'pong':
        // Server responded to ping
        break;
        
      case 'order_created':
      case 'order_started':
      case 'order_stopped':
      case 'order_resumed':
      case 'order_completed':
      case 'order_deleted':
        window.dispatchEvent(new CustomEvent('ws:order_update', { 
          detail: { action: type, data, timestamp } 
        }));
        break;
        
      case 'machine_status_changed':
        window.dispatchEvent(new CustomEvent('ws:machine_update', { 
          detail: { data, timestamp } 
        }));
        break;
        
      case 'notification':
        window.dispatchEvent(new CustomEvent('ws:notification', { 
          detail: { data, timestamp } 
        }));
        break;
        
      default:
        console.log('Unknown WebSocket message type:', type);
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Ping/Pong to keep connection alive
  startPingInterval() {
    this.stopPingInterval();
    
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping', {});
      }
    }, 30000); // Ping every 30 seconds
  }

  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Utility methods
  generateMessageId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: this.ws ? this.ws.readyState : null,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length
    };
  }

  // Subscribe to order updates
  subscribeToOrders(callback) {
    const events = [
      'order_created',
      'order_started', 
      'order_stopped',
      'order_resumed',
      'order_completed',
      'order_deleted'
    ];
    
    const unsubscribers = events.map(event => 
      this.on(event, (data, timestamp) => callback(event, data, timestamp))
    );
    
    // Return function to unsubscribe from all
    return () => unsubscribers.forEach(unsub => unsub());
  }

  // Subscribe to machine updates
  subscribeToMachines(callback) {
    return this.on('machine_status_changed', callback);
  }

  // Subscribe to notifications
  subscribeToNotifications(callback) {
    return this.on('notification', callback);
  }
}

// Create singleton instance
window.WS = new WebSocketService();

// Auto-connect when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.WS.connect().catch(error => {
      console.error('Initial WebSocket connection failed:', error);
    });
  });
} else {
  window.WS.connect().catch(error => {
    console.error('Initial WebSocket connection failed:', error);
  });
