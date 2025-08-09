// Refactored Server - Testing Integration
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import our new modular components
const { addResponseUtils } = require('./utils/response');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const ordersRoutes = require('./routes/orders.routes');
const machinesRoutes = require('./routes/machines.routes');
const usersRoutes = require('./routes/users.routes');
const laborRoutes = require('./routes/labor.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const reportsRoutes = require('./routes/reports.routes');
const systemRoutes = require('./routes/system.routes');
const plannerRoutes = require('./routes/planner.routes');
const configurationRoutes = require('./routes/configuration.routes');

// WebSocket integration
const { initializeWebSocket, addWebSocketToApp, startCleanupSchedule } = require('./middleware/websocket');

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://oracles.africa',
      'https://www.oracles.africa',
      'https://dev.oracles.africa'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add response utilities to all routes
app.use(addResponseUtils);

// Add WebSocket functionality to all routes
app.use(addWebSocketToApp);

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.success({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    refactored: true
  }, 'Refactored server is running');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/labor', laborRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/config', configurationRoutes);

// Legacy route compatibility
app.use('/api/labour', laborRoutes); // British spelling compatibility
app.use('/api/planner', plannerRoutes); // Legacy planner endpoint compatibility
app.use('/api/labor-planner', plannerRoutes); // Labor planner with dash compatibility

// Labor assignments compatibility mappings
app.get('/api/labor-assignments', (req, res, next) => {
  req.url = '/assignments';
  laborRoutes(req, res, next);
});
app.post('/api/labor-assignments', (req, res, next) => {
  req.url = '/assignments';
  laborRoutes(req, res, next);
});
app.delete('/api/labor-assignments/:id', (req, res, next) => {
  req.url = '/assignments/' + req.params.id;
  laborRoutes(req, res, next);
});
app.post('/api/labor-assignments/copy-week', (req, res, next) => {
  req.url = '/assignments/copy-week';
  laborRoutes(req, res, next);
});
app.post('/api/labor-assignments/finalize-week', (req, res, next) => {
  req.url = '/assignments/finalize-week';
  laborRoutes(req, res, next);
});
app.post('/api/labor-assignments/auto-populate-daily', (req, res, next) => {
  req.url = '/assignments/auto-populate-daily';
  laborRoutes(req, res, next);
});
app.post('/api/labor-assignments/lock-daily', (req, res, next) => {
  req.url = '/assignments/lock-daily';
  laborRoutes(req, res, next);
});

// Dashboard route compatibility - Production endpoints mapped to analytics
app.get('/api/production/floor-overview', (req, res, next) => {
  req.url = '/floor-overview';
  analyticsRoutes(req, res, next);
});
app.get('/api/production/status', (req, res, next) => {
  req.url = '/production-status';
  analyticsRoutes(req, res, next);
});
app.use('/api/production', analyticsRoutes); // Production endpoints under analytics

// System route compatibility - Direct route mappings  
app.get('/api/settings/general', (req, res, next) => {
  req.url = '/settings/general';
  systemRoutes(req, res, next);
});
app.put('/api/settings/general', (req, res, next) => {
  req.url = '/settings/general';
  systemRoutes(req, res, next);
});
app.get('/api/environments', (req, res, next) => {
  req.url = '/environments';
  systemRoutes(req, res, next);
});
app.post('/api/environments', (req, res, next) => {
  req.url = '/environments';
  systemRoutes(req, res, next);
});
app.get('/api/machine-types', (req, res, next) => {
  req.url = '/machine-types';
  systemRoutes(req, res, next);
});
app.post('/api/machine-types', (req, res, next) => {
  req.url = '/machine-types';
  systemRoutes(req, res, next);
});
app.put('/api/machine-types/:id', (req, res, next) => {
  req.url = '/machine-types/' + req.params.id;
  systemRoutes(req, res, next);
});
app.delete('/api/machine-types/:id', (req, res, next) => {
  req.url = '/machine-types/' + req.params.id;
  systemRoutes(req, res, next);
});
app.use('/api/settings', systemRoutes); // Settings endpoints compatibility
app.use('/api/system', systemRoutes); // System routes

// Catch-all for frontend routes (SPA) - exclude API routes
app.get('*', (req, res, next) => {
  // Let API routes go to 404 handler
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Serve frontend for non-API routes
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling
app.use(errorHandler);
app.use(notFoundHandler);

// Test function to verify components work
const testComponents = async () => {
  console.log('🧪 Testing refactored components...');
  
  try {
    // Test database connection
    const db = require('./config/database');
    await db.query('SELECT NOW() as current_time');
    console.log('✅ Database connection: OK');
    
    // Test authentication middleware
    const auth = require('./middleware/auth');
    const testToken = auth.generateToken({ id: 1, username: 'test', role: 'admin' });
    const decoded = auth.verifyToken(testToken);
    console.log('✅ Authentication middleware: OK');
    
    // Test response utilities
    const { ResponseUtils } = require('./utils/response');
    console.log('✅ Response utilities: OK');
    
    // Test database utils
    const DatabaseUtils = require('./utils/database');
    console.log('✅ Database utilities: OK');
    
    console.log('🎉 All components tested successfully!');
    
  } catch (error) {
    console.error('❌ Component test failed:', error.message);
    throw error;
  }
};

// Only start server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000; // Production port
  const http = require('http');
  
  testComponents().then(() => {
    // Create HTTP server for WebSocket integration
    const server = http.createServer(app);
    
    // Initialize WebSocket server
    const websocketService = initializeWebSocket(server);
    
    // Start WebSocket cleanup scheduler
    startCleanupSchedule();
    
    server.listen(PORT, () => {
      console.log(`🚀 Production refactored server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth test: http://localhost:${PORT}/api/auth/login`);
      console.log(`⚙️ System routes: http://localhost:${PORT}/api/system/health`);
      console.log(`🌐 WebSocket server initialized`);
    });
    
    return { server, websocketService };
  }).catch(error => {
    console.error('❌ Failed to start refactored server:', error);
    process.exit(1);
  });
}

module.exports = { app, testComponents };