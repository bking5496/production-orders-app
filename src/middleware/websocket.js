// WebSocket Middleware - Integration helper for Express app
const websocketService = require('../services/websocket.service');

/**
 * Initialize WebSocket server with Express app
 */
function initializeWebSocket(server) {
  websocketService.initialize(server);
  return websocketService;
}

/**
 * Middleware to add WebSocket broadcast function to Express app
 */
function addWebSocketToApp(req, res, next) {
  // Add broadcast function to app instance for easy access
  if (!req.app.get('broadcast')) {
    req.app.set('broadcast', websocketService.getBroadcastFunction());
    req.app.set('websocketService', websocketService);
  }
  
  // Add WebSocket utilities to request object
  req.broadcast = websocketService.getBroadcastFunction();
  req.sendToUser = websocketService.sendToUser.bind(websocketService);
  req.websocket = {
    broadcast: websocketService.broadcast.bind(websocketService),
    sendToUser: websocketService.sendToUser.bind(websocketService),
    getConnectedCount: websocketService.getConnectedClientsCount.bind(websocketService),
    getClientsByChannel: websocketService.getClientsByChannel.bind(websocketService)
  };
  
  next();
}

/**
 * Start periodic cleanup of inactive connections
 */
function startCleanupSchedule(intervalMs = 300000) { // 5 minutes
  setInterval(() => {
    websocketService.cleanupInactiveConnections();
  }, intervalMs);
  
  console.log('🧹 WebSocket cleanup scheduler started');
}

module.exports = {
  initializeWebSocket,
  addWebSocketToApp,
  startCleanupSchedule,
  websocketService
};