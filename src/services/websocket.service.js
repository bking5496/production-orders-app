// WebSocket Service - Real-time Communication Layer
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { getSecret } = require('../../security/secrets-manager');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map to store client metadata
    this.JWT_SECRET = getSecret('JWT_SECRET') || process.env.JWT_SECRET;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('🌐 WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    console.log('New WebSocket connection attempt');
    
    // Authenticate WebSocket connection using token from query or headers
    const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token') || 
                  req.headers['sec-websocket-protocol'];
    
    if (!token) {
      console.log('❌ WebSocket connection denied: No token provided');
      ws.close(1008, 'Authentication required');
      return;
    }
    
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);
      
      // Store client information
      const clientId = this.generateClientId();
      this.clients.set(clientId, {
        ws,
        user: decoded,
        subscriptions: [],
        room: null,
        isAuthenticated: true,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // Set client metadata on WebSocket object for backward compatibility
      ws.clientId = clientId;
      ws.user = decoded;
      ws.subscriptions = [];
      ws.isAuthenticated = true;
      
      console.log(`✅ WebSocket authenticated: ${decoded.username} (${decoded.role})`);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        data: {
          user: { id: decoded.id, username: decoded.username, role: decoded.role },
          message: 'WebSocket connection authenticated',
          clientId
        }
      }));

      // Set up event handlers
      this.setupEventHandlers(ws, clientId);
      
    } catch (error) {
      console.log('❌ WebSocket authentication failed:', error.message);
      ws.close(1008, 'Invalid token');
      return;
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  setupEventHandlers(ws, clientId) {
    ws.on('message', (message) => {
      this.handleMessage(ws, clientId, message);
    });
    
    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleError(clientId, error);
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(ws, clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        ws.close(1008, 'Client not found');
        return;
      }

      // Update last activity
      client.lastActivity = new Date();
      
      const data = JSON.parse(message);
      
      // Only handle messages from authenticated connections
      if (!client.isAuthenticated) {
        ws.send(JSON.stringify({ type: 'error', data: { error: 'Not authenticated' } }));
        return;
      }
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          this.handlePing(ws);
          break;
          
        case 'subscribe':
          this.handleSubscribe(ws, clientId, data.data?.channels || []);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscribe(ws, clientId, data.data?.channels || []);
          break;
          
        case 'join_room':
          this.handleJoinRoom(ws, clientId, data.data?.room);
          break;
          
        case 'leave_room':
          this.handleLeaveRoom(ws, clientId, data.data?.room);
          break;

        case 'heartbeat':
          this.handleHeartbeat(ws, clientId);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
          ws.send(JSON.stringify({
            type: 'error',
            data: { error: `Unknown message type: ${data.type}` }
          }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: { error: 'Invalid message format' }
      }));
    }
  }

  /**
   * Handle ping message
   */
  handlePing(ws) {
    ws.send(JSON.stringify({ 
      type: 'pong', 
      data: { serverTime: new Date().toISOString() }
    }));
  }

  /**
   * Handle channel subscription
   */
  handleSubscribe(ws, clientId, channels) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Validate channels based on user role
    const allowedChannels = this.getAllowedChannels(client.user);
    const validChannels = channels.filter(channel => allowedChannels.includes(channel));
    
    client.subscriptions = [...new Set([...client.subscriptions, ...validChannels])];
    ws.subscriptions = client.subscriptions; // Backward compatibility
    
    ws.send(JSON.stringify({
      type: 'subscription_confirmed',
      data: { 
        channels: validChannels,
        rejected: channels.filter(channel => !validChannels.includes(channel))
      }
    }));
    
    console.log(`📺 ${client.user.username} subscribed to:`, validChannels);
  }

  /**
   * Handle channel unsubscription
   */
  handleUnsubscribe(ws, clientId, channels) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions = client.subscriptions.filter(sub => !channels.includes(sub));
    ws.subscriptions = client.subscriptions; // Backward compatibility
    
    ws.send(JSON.stringify({
      type: 'unsubscription_confirmed',
      data: { channels }
    }));
    
    console.log(`📺 ${client.user.username} unsubscribed from:`, channels);
  }

  /**
   * Handle room joining
   */
  handleJoinRoom(ws, clientId, room) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.room = room;
    ws.room = room; // Backward compatibility
    
    ws.send(JSON.stringify({
      type: 'room_joined',
      data: { room }
    }));
    
    console.log(`🏠 ${client.user.username} joined room:`, room);
  }

  /**
   * Handle room leaving
   */
  handleLeaveRoom(ws, clientId, room) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.room = null;
    ws.room = null; // Backward compatibility
    
    ws.send(JSON.stringify({
      type: 'room_left',
      data: { room }
    }));
    
    console.log(`🏠 ${client.user.username} left room:`, room);
  }

  /**
   * Handle heartbeat message
   */
  handleHeartbeat(ws, clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();
    
    ws.send(JSON.stringify({
      type: 'heartbeat_ack',
      data: { timestamp: new Date().toISOString() }
    }));
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`🔌 WebSocket disconnected: ${client.user?.username || 'Unknown'}`);
      this.clients.delete(clientId);
    }
  }

  /**
   * Handle WebSocket error
   */
  handleError(clientId, error) {
    const client = this.clients.get(clientId);
    if (client) {
      console.error(`WebSocket error for ${client.user?.username}:`, error);
    }
  }

  /**
   * Enhanced broadcast function with channel filtering and authentication
   */
  broadcast(type, data, channel = 'all', room = null) {
    const message = { 
      type, 
      data, 
      channel,
      timestamp: new Date().toISOString()
    };
    
    if (room) {
      message.room = room;
    }
    
    let sentCount = 0;
    
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN && client.isAuthenticated) {
        // Check channel permissions
        const canReceive = channel === 'all' || 
                          (client.subscriptions && client.subscriptions.includes(channel));
        
        // Check room permissions if specified
        const roomMatch = !room || client.room === room;
        
        if (canReceive && roomMatch) {
          try {
            client.ws.send(JSON.stringify(message));
            sentCount++;
          } catch (error) {
            console.error(`Failed to send message to client ${client.user.username}:`, error);
          }
        }
      }
    });
    
    console.log(`📡 Broadcast sent: ${type} to channel: ${channel}${room ? ` (room: ${room})` : ''} (${sentCount} clients)`);
    return sentCount;
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId, type, data) {
    let sentCount = 0;
    
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN && 
          client.isAuthenticated && 
          client.user.id === userId) {
        try {
          client.ws.send(JSON.stringify({
            type,
            data,
            timestamp: new Date().toISOString()
          }));
          sentCount++;
        } catch (error) {
          console.error(`Failed to send message to user ${userId}:`, error);
        }
      }
    });
    
    return sentCount;
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    return this.clients.size;
  }

  /**
   * Get clients by channel
   */
  getClientsByChannel(channel) {
    const clients = [];
    this.clients.forEach((client) => {
      if (client.subscriptions.includes(channel)) {
        clients.push({
          userId: client.user.id,
          username: client.user.username,
          role: client.user.role,
          connectedAt: client.connectedAt,
          lastActivity: client.lastActivity
        });
      }
    });
    return clients;
  }

  /**
   * Clean up inactive connections
   */
  cleanupInactiveConnections(timeoutMs = 300000) { // 5 minutes
    const now = new Date();
    const inactiveClients = [];
    
    this.clients.forEach((client, clientId) => {
      if (now - client.lastActivity > timeoutMs) {
        inactiveClients.push(clientId);
      }
    });
    
    inactiveClients.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client) {
        client.ws.close(1000, 'Inactive connection cleanup');
        this.clients.delete(clientId);
      }
    });
    
    if (inactiveClients.length > 0) {
      console.log(`🧹 Cleaned up ${inactiveClients.length} inactive WebSocket connections`);
    }
  }

  /**
   * Get allowed channels for user role
   */
  getAllowedChannels(user) {
    const baseChannels = ['general', 'notifications'];
    
    switch (user.role) {
      case 'admin':
        return [...baseChannels, 'admin', 'production', 'machines', 'alerts', 'analytics'];
      case 'supervisor':
        return [...baseChannels, 'production', 'machines', 'alerts', 'analytics'];
      case 'operator':
        return [...baseChannels, 'production', 'machines'];
      default:
        return baseChannels;
    }
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get WebSocket server instance
   */
  getServer() {
    return this.wss;
  }

  /**
   * Get backward compatibility broadcast function
   */
  getBroadcastFunction() {
    return this.broadcast.bind(this);
  }
}

module.exports = new WebSocketService();