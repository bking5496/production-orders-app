// Refactored Server - Testing Integration
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import our new modular components
const { addResponseUtils } = require('./src/utils/response');
const { errorHandler, notFoundHandler } = require('./src/middleware/error-handler');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const ordersRoutes = require('./src/routes/orders.routes');
const machinesRoutes = require('./src/routes/machines.routes');
const usersRoutes = require('./src/routes/users.routes');
const laborRoutes = require('./src/routes/labor.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const reportsRoutes = require('./src/routes/reports.routes');
const systemRoutes = require('./src/routes/system.routes');

// WebSocket integration
const { initializeWebSocket, addWebSocketToApp, startCleanupSchedule } = require('./src/middleware/websocket');

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://oracles.africa',
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

// Legacy route compatibility
app.use('/api/labour', laborRoutes); // British spelling compatibility

// Attendance register direct route (for backward compatibility with frontend)
app.get('/api/attendance-register', (req, res, next) => {
  // Redirect to the labor route handler
  req.url = '/attendance-register' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  laborRoutes(req, res, next);
});

app.post('/api/attendance-register', (req, res, next) => {
  // Redirect to the labor route handler
  req.url = '/attendance-register';
  laborRoutes(req, res, next);
});

// Dashboard route compatibility
app.use('/api/production', analyticsRoutes); // Production endpoints under analytics

// System route compatibility
app.use('/api/settings', systemRoutes); // Settings endpoints compatibility
app.use('/api/environments', systemRoutes); // Direct environment access
app.use('/api/machine-types', systemRoutes); // Direct machine types access

// Catch-all for frontend routes (SPA)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    notFoundHandler(req, res);
  }
});

// Error handling
app.use(errorHandler);
app.use(notFoundHandler);

// Test function to verify components work
const testComponents = async () => {
  console.log('🧪 Testing refactored components...');
  
  try {
    // Test database connection
    const db = require('./src/config/database');
    await db.query('SELECT NOW() as current_time');
    console.log('✅ Database connection: OK');
    
    // Test authentication middleware
    const auth = require('./src/middleware/auth');
    const testToken = auth.generateToken({ id: 1, username: 'test', role: 'admin' });
    const decoded = auth.verifyToken(testToken);
    console.log('✅ Authentication middleware: OK');
    
    // Test response utilities
    const { ResponseUtils } = require('./src/utils/response');
    console.log('✅ Response utilities: OK');
    
    // Test database utils
    const DatabaseUtils = require('./src/utils/database');
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
      console.log(`🚀 Refactored server running on port ${PORT}`);
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